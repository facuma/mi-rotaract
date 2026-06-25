import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailTemplateType, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmailsService } from '../event-emails/event-emails.service';
import { EventCheckInService } from '../event-check-in/event-check-in.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';
import { EventPaymentsService } from './event-payments.service';

@Injectable()
export class EventPaymentsHandlers {
  private readonly logger = new Logger(EventPaymentsHandlers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: EventPaymentsService,
    private readonly emails: EventEmailsService,
    private readonly checkIn: EventCheckInService,
    private readonly bus: EventsBusService,
  ) {}

  @OnEvent(DomainEvents.RegistrationCreated, { async: true })
  async onRegistrationCreated(payload: { registrationId: string }) {
    await this.payments.ensurePaymentsForRegistration(payload.registrationId);
  }

  @OnEvent(DomainEvents.PaymentRecorded, { async: true })
  async onPaymentRecorded(payload: { paymentId: string; registrationId: string; eventId: string; installmentId: string }) {
    const payment = await this.prisma.eventPayment.findUnique({
      where: { id: payload.paymentId },
      include: { installment: true, registration: { include: { event: true } } },
    });
    if (!payment) return;
    const { registration, installment } = payment;
    const ticket = await this.prisma.eventTicket.findUnique({ where: { eventId: payload.eventId } });
    await this.emails.sendForRegistration(
      EmailTemplateType.PAYMENT_RECORDED,
      registration.event,
      registration,
      {
        installmentLabel: installment.label,
        paidAmount: Number(payment.amount).toFixed(2),
        currency: ticket?.currency ?? 'ARS',
        paymentMethod: payment.method ?? 'OTHER',
        paidAt: payment.paidAt?.toLocaleString('es-AR') ?? '',
      },
    );
  }

  @OnEvent(DomainEvents.RegistrationFullyPaid, { async: true })
  async onFullyPaid(payload: { registrationId: string; eventId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: true },
    });
    if (!reg) return;
    if (reg.status === RegistrationStatus.PENDING_PAYMENT) {
      await this.prisma.eventRegistration.update({
        where: { id: reg.id },
        data: { status: RegistrationStatus.CONFIRMED },
      });
      this.bus.emit(DomainEvents.RegistrationConfirmed, { registrationId: reg.id, eventId: reg.eventId });
    } else {
      const token = await this.checkIn.ensureToken(reg.id);
      const png = await this.checkIn.renderQrPng(token);
      const checkInUrl = this.checkIn.tokenUrl(token);
      await this.emails.sendForRegistration(
        EmailTemplateType.PAYMENT_COMPLETE,
        reg.event,
        reg,
        { checkInUrl },
        [{ filename: 'qr-acreditacion.png', content: png, contentType: 'image/png' }],
      );
    }
  }
}
