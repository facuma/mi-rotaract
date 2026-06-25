import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';
import { PAYMENT_GATEWAY, PaymentGateway } from './gateway/payment-gateway.interface';
import { UpsertTicketDto } from './dto/upsert-ticket.dto';
import { UpsertInstallmentsDto } from './dto/upsert-installments.dto';
import { RecordPaymentDto, WaivePaymentDto } from './dto/record-payment.dto';

const CENTS = 100;
function toCents(amount: number | Prisma.Decimal): number {
  const n = typeof amount === 'number' ? amount : Number(amount);
  return Math.round(n * CENTS);
}

@Injectable()
export class EventPaymentsService {
  private readonly logger = new Logger(EventPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventsBusService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async upsertTicket(eventId: string, dto: UpsertTicketDto, actorUserId: string) {
    await this.assertEventExists(eventId);
    await this.assertNoPaidPayments(eventId, 'ticket');
    const ticket = await this.prisma.eventTicket.upsert({
      where: { eventId },
      create: { eventId, amount: new Prisma.Decimal(dto.amount), currency: dto.currency ?? 'ARS' },
      update: { amount: new Prisma.Decimal(dto.amount), currency: dto.currency ?? 'ARS' },
    });
    await this.prisma.event.update({ where: { id: eventId }, data: { isPaid: true } });
    await this.audit.log({
      actorUserId,
      action: 'event_ticket.upserted',
      entityType: 'event',
      entityId: eventId,
      metadata: { amount: dto.amount, currency: ticket.currency },
    });
    return ticket;
  }

  async getTicket(eventId: string) {
    return this.prisma.eventTicket.findUnique({ where: { eventId } });
  }

  async upsertInstallments(eventId: string, dto: UpsertInstallmentsDto, actorUserId: string) {
    const ticket = await this.prisma.eventTicket.findUnique({ where: { eventId } });
    if (!ticket) throw new BadRequestException('Primero definí el monto del ticket del evento');
    await this.assertNoPaidPayments(eventId, 'installments');
    const orders = dto.installments.map((i) => i.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length)
      throw new BadRequestException('Los números de cuota deben ser únicos');
    const sumCents = dto.installments.reduce((acc, i) => acc + toCents(i.amount), 0);
    if (sumCents !== toCents(ticket.amount)) {
      throw new BadRequestException(
        `La suma de las cuotas (${sumCents / CENTS}) no coincide con el monto del ticket (${Number(ticket.amount)})`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.eventInstallment.deleteMany({ where: { eventId } });
      const created: any[] = [];
      for (const inst of dto.installments) {
        created.push(
          await tx.eventInstallment.create({
            data: {
              eventId,
              order: inst.order,
              label: inst.label,
              amount: new Prisma.Decimal(inst.amount),
              dueDate: new Date(inst.dueDate),
            },
          }),
        );
      }
      await this.audit.log({
        actorUserId,
        action: 'event_installments.upserted',
        entityType: 'event',
        entityId: eventId,
        metadata: { count: created.length },
      });
      return created.sort((a, b) => a.order - b.order);
    });
  }

  async listInstallments(eventId: string) {
    return this.prisma.eventInstallment.findMany({ where: { eventId }, orderBy: { order: 'asc' } });
  }

  async ensurePaymentsForRegistration(registrationId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, eventId: true },
    });
    if (!reg) return;
    const installments = await this.prisma.eventInstallment.findMany({ where: { eventId: reg.eventId } });
    if (installments.length === 0) return;
    for (const inst of installments) {
      await this.prisma.eventPayment.upsert({
        where: { registrationId_installmentId: { registrationId, installmentId: inst.id } },
        create: { registrationId, installmentId: inst.id, amount: inst.amount, status: PaymentStatus.PENDING },
        update: {},
      });
    }
  }

  async recordPayment(
    eventId: string,
    registrationId: string,
    installmentId: string,
    dto: RecordPaymentDto,
    actorUserId: string,
  ) {
    const payment = await this.findPaymentOrFail(eventId, registrationId, installmentId);
    if (payment.status === PaymentStatus.PAID) throw new ConflictException('Este pago ya fue registrado');
    if (payment.status === PaymentStatus.WAIVED) throw new ConflictException('Este pago fue eximido y no puede cobrarse');
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    await this.gateway.recordPayment({
      paymentId: payment.id,
      method: dto.method,
      paidAt,
      receiptNote: dto.receiptNote,
      actorUserId,
    });
    const updated = await this.prisma.eventPayment.findUniqueOrThrow({ where: { id: payment.id } });
    await this.audit.log({
      actorUserId,
      action: 'event_payment.recorded',
      entityType: 'event_payment',
      entityId: payment.id,
      metadata: { eventId, registrationId, installmentId, method: dto.method, amount: Number(updated.amount) },
    });
    this.bus.emit(DomainEvents.PaymentRecorded, { paymentId: updated.id, registrationId, eventId, installmentId });
    await this.promoteIfFullyPaid(eventId, registrationId);
    return updated;
  }

  async waivePayment(
    eventId: string,
    registrationId: string,
    installmentId: string,
    dto: WaivePaymentDto,
    actorUserId: string,
  ) {
    const payment = await this.findPaymentOrFail(eventId, registrationId, installmentId);
    if (payment.status === PaymentStatus.PAID) throw new ConflictException('No podés eximir un pago ya cobrado');
    const updated = await this.prisma.eventPayment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.WAIVED, receiptNote: dto.reason ?? null, receivedById: actorUserId },
    });
    await this.audit.log({
      actorUserId,
      action: 'event_payment.waived',
      entityType: 'event_payment',
      entityId: payment.id,
      metadata: { eventId, registrationId, installmentId, reason: dto.reason },
    });
    await this.promoteIfFullyPaid(eventId, registrationId);
    return updated;
  }

  async promoteIfFullyPaid(eventId: string, registrationId: string) {
    const payments = await this.prisma.eventPayment.findMany({ where: { registrationId } });
    if (payments.length === 0) return;
    const allSettled = payments.every(
      (p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.WAIVED,
    );
    if (!allSettled) return;
    this.bus.emit(DomainEvents.RegistrationFullyPaid, { registrationId, eventId });
  }

  async getPaymentSummary(eventId: string) {
    const [installments, payments, registrations] = await Promise.all([
      this.prisma.eventInstallment.findMany({ where: { eventId }, orderBy: { order: 'asc' } }),
      this.prisma.eventPayment.findMany({ where: { installment: { eventId } } }),
      this.prisma.eventRegistration.findMany({
        where: { eventId, status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT] } },
        select: { id: true, email: true, fullName: true, status: true },
      }),
    ]);
    const totalExpectedCents = registrations.length * installments.reduce((acc, i) => acc + toCents(i.amount), 0);
    const totalPaidCents = payments.filter((p) => p.status === PaymentStatus.PAID).reduce((acc, p) => acc + toCents(p.amount), 0);
    const totalOverdueCents = payments.filter((p) => p.status === PaymentStatus.OVERDUE).reduce((acc, p) => acc + toCents(p.amount), 0);
    const totalPendingCents = payments.filter((p) => p.status === PaymentStatus.PENDING).reduce((acc, p) => acc + toCents(p.amount), 0);
    const byInstallment = installments.map((inst) => {
      const paymentsForInst = payments.filter((p) => p.installmentId === inst.id);
      return {
        installmentId: inst.id,
        order: inst.order,
        label: inst.label,
        paidCount: paymentsForInst.filter((p) => p.status === PaymentStatus.PAID).length,
        pendingCount: paymentsForInst.filter((p) => p.status === PaymentStatus.PENDING).length,
        overdueCount: paymentsForInst.filter((p) => p.status === PaymentStatus.OVERDUE).length,
        waivedCount: paymentsForInst.filter((p) => p.status === PaymentStatus.WAIVED).length,
      };
    });
    return {
      totalExpected: totalExpectedCents / CENTS,
      totalPaid: totalPaidCents / CENTS,
      totalPending: totalPendingCents / CENTS,
      totalOverdue: totalOverdueCents / CENTS,
      collectionRate: totalExpectedCents === 0 ? 0 : Math.round((totalPaidCents / totalExpectedCents) * 100),
      byInstallment,
    };
  }

  async listPayments(eventId: string) {
    const [registrations, installments] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { eventId, status: { not: RegistrationStatus.CANCELLED } },
        include: { payments: { include: { installment: true } } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.eventInstallment.findMany({ where: { eventId }, orderBy: { order: 'asc' } }),
    ]);
    return {
      installments,
      registrations: registrations.map((r) => ({
        id: r.id,
        email: r.email,
        fullName: r.fullName,
        status: r.status,
        payments: r.payments.map((p) => ({
          id: p.id,
          installmentId: p.installmentId,
          status: p.status,
          amount: Number(p.amount),
          paidAt: p.paidAt,
          method: p.method,
          receiptNote: p.receiptNote,
        })),
      })),
    };
  }

  async markOverduePayments() {
    const now = new Date();
    const overdueInstallments = await this.prisma.eventInstallment.findMany({
      where: { dueDate: { lt: now } },
      select: { id: true, eventId: true },
    });
    if (overdueInstallments.length === 0) return 0;
    const result = await this.prisma.eventPayment.updateMany({
      where: { installmentId: { in: overdueInstallments.map((i) => i.id) }, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.OVERDUE },
    });
    if (result.count > 0) {
      this.logger.log(`marked ${result.count} payments as OVERDUE`);
      for (const inst of overdueInstallments) {
        this.bus.emit(DomainEvents.InstallmentOverdue, { installmentId: inst.id, eventId: inst.eventId, overdueCount: result.count });
      }
    }
    return result.count;
  }

  async assertEventExists(eventId: string) {
    const e = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!e) throw new NotFoundException('Evento no encontrado');
  }

  async assertNoPaidPayments(eventId: string, what: 'ticket' | 'installments') {
    const paidCount = await this.prisma.eventPayment.count({
      where: { installment: { eventId }, status: PaymentStatus.PAID },
    });
    if (paidCount > 0) {
      throw new ConflictException(
        `No podés cambiar el ${what === 'ticket' ? 'monto del ticket' : 'esquema de cuotas'}: ya hay pagos registrados.`,
      );
    }
  }

  async findPaymentOrFail(eventId: string, registrationId: string, installmentId: string) {
    const payment = await this.prisma.eventPayment.findUnique({
      where: { registrationId_installmentId: { registrationId, installmentId } },
      include: { installment: true },
    });
    if (!payment || payment.installment.eventId !== eventId)
      throw new NotFoundException('Pago no encontrado para ese evento');
    return payment;
  }
}
