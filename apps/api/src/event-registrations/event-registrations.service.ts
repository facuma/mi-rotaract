import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, RegistrationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';
import { EventRegistrationFormsService } from '../event-registration-forms/event-registration-forms.service';
import { MembershipCheckService } from '../club/membership-check.service';
import { CsvRegistrationExporter } from './exporters/csv-exporter';
import { XlsxRegistrationExporter } from './exporters/xlsx-exporter';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';

const eventLite = {
  id: true,
  title: true,
  startsAt: true,
  location: true,
  status: true,
  maxCapacity: true,
  isPaid: true,
  clubId: true,
} as const;

@Injectable()
export class EventRegistrationsService {
  private readonly logger = new Logger(EventRegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventsBusService,
    private readonly csv: CsvParserService,
    private readonly forms: EventRegistrationFormsService,
    private readonly csvExporter: CsvRegistrationExporter,
    private readonly xlsxExporter: XlsxRegistrationExporter,
    private readonly membershipCheck: MembershipCheckService,
  ) {}

  async register(eventId: string, dto: CreateRegistrationDto, actor: any) {
    if (actor && actor.role === Role.PARTICIPANT) {
      await this.membershipCheck.requireActiveMembership(actor.id);
    }
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: eventLite });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.status !== EventStatus.PUBLISHED)
      throw new BadRequestException('Solo se puede inscribir a eventos PUBLISHED');
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_email: { eventId, email } },
    });
    if (existing && existing.status !== RegistrationStatus.CANCELLED)
      throw new ConflictException('Ya existe una inscripción con ese email');
    const confirmedCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT] } },
    });
    let status: RegistrationStatus = RegistrationStatus.CONFIRMED;
    let waitlistPosition: number | null = null;
    if (event.isPaid) status = RegistrationStatus.PENDING_PAYMENT;
    if (event.maxCapacity != null && confirmedCount >= event.maxCapacity) {
      status = RegistrationStatus.WAITLISTED;
      const waitlistedCount = await this.prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.WAITLISTED },
      });
      waitlistPosition = waitlistedCount + 1;
    }
    let additionalData: Record<string, unknown> | null = (dto.additionalData as any) ?? null;
    const formData = (additionalData as any)?.formData;
    if (formData) {
      const { errors, formVersion } = await this.forms.validateSubmission(eventId, formData);
      if (errors.length > 0)
        throw new BadRequestException({ message: 'Datos del formulario inválidos', fieldErrors: errors });
      additionalData = { ...(additionalData ?? {}), formVersion };
    }
    const data = {
      eventId,
      userId: actor?.id ?? null,
      email,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,
      status,
      waitlistPosition,
      additionalData: additionalData ? JSON.stringify(additionalData) : null,
    };
    const registration = existing
      ? await this.prisma.eventRegistration.update({ where: { id: existing.id }, data: { ...data, cancelledAt: null } })
      : await this.prisma.eventRegistration.create({ data });
    await this.audit.log({
      actorUserId: actor?.id,
      clubId: event.clubId ?? undefined,
      action: 'registration.created',
      entityType: 'event_registration',
      entityId: registration.id,
      metadata: { eventId, status },
    });
    this.bus.emit(DomainEvents.RegistrationCreated, { registrationId: registration.id, eventId });
    if (status === RegistrationStatus.CONFIRMED)
      this.bus.emit(DomainEvents.RegistrationConfirmed, { registrationId: registration.id, eventId });
    return registration;
  }

  async rsvp(eventId: string, actor: any) {
    if (!actor.email || !actor.fullName) throw new BadRequestException('El usuario debe tener email y nombre');
    return this.register(eventId, { email: actor.email, fullName: actor.fullName }, actor);
  }

  async list(eventId: string, query: QueryRegistrationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where = { eventId, ...(query.status ? { status: query.status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where,
        orderBy: [{ status: 'asc' }, { waitlistPosition: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventRegistration.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async cancel(eventId: string, registrationId: string, actor: any) {
    const registration = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!registration || registration.eventId !== eventId) throw new NotFoundException('Inscripción no encontrada');
    if (registration.status === RegistrationStatus.CANCELLED) return registration;
    const isOwner = registration.userId === actor.id || registration.email === actor.email;
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { clubId: true, cancellationClosesAt: true, endsAt: true },
    });
    if (!isOwner && actor.role !== Role.SECRETARY) {
      const memberships = await this.prisma.membership.findMany({
        where: { userId: actor.id, isPresident: true },
        select: { clubId: true },
      });
      const clubIds = memberships.map((m) => m.clubId);
      if (!event?.clubId || !clubIds.includes(event.clubId)) throw new ForbiddenException('No podés cancelar esta inscripción');
    }
    if (actor.role !== Role.SECRETARY) {
      const now = new Date();
      if (event?.cancellationClosesAt && now > event.cancellationClosesAt)
        throw new ConflictException('La ventana de cancelación ya cerró. Contactá a un secretario.');
      if (event?.endsAt && now > event.endsAt) throw new ConflictException('El evento ya finalizó');
    }
    const updated = await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED, cancelledAt: new Date(), waitlistPosition: null },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'registration.cancelled',
      entityType: 'event_registration',
      entityId: registration.id,
      metadata: { eventId, previousStatus: registration.status },
    });
    this.bus.emit(DomainEvents.RegistrationCancelled, { registrationId: registration.id, eventId });
    if (registration.status === RegistrationStatus.CONFIRMED) await this.promoteFromWaitlist(eventId);
    return updated;
  }

  async promoteFromWaitlist(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { maxCapacity: true } });
    if (!event?.maxCapacity) return null;
    const confirmedCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT] } },
    });
    if (confirmedCount >= event.maxCapacity) return null;
    const next = await this.prisma.eventRegistration.findFirst({
      where: { eventId, status: RegistrationStatus.WAITLISTED },
      orderBy: [{ waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    });
    if (!next) return null;
    const promoted = await this.prisma.eventRegistration.update({
      where: { id: next.id },
      data: { status: RegistrationStatus.CONFIRMED, waitlistPosition: null },
    });
    this.bus.emit(DomainEvents.RegistrationWaitlistPromoted, { registrationId: promoted.id, eventId });
    return promoted;
  }

  async export(eventId: string, format: 'csv' | 'xlsx' = 'csv') {
    const [event, rows, installments, meals, formRecord, ticket] = await Promise.all([
      this.prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, slug: true, startsAt: true, endsAt: true },
      }),
      this.prisma.eventRegistration.findMany({
        where: { eventId },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: { payments: { include: { installment: true } }, mealConsumptions: true },
      }),
      this.prisma.eventInstallment.findMany({ where: { eventId }, orderBy: { order: 'asc' } }),
      this.prisma.eventMeal.findMany({ where: { eventId }, orderBy: { order: 'asc' } }),
      this.prisma.eventRegistrationForm.findUnique({ where: { eventId } }),
      this.prisma.eventTicket.findUnique({ where: { eventId } }),
    ]);
    if (!event) throw new NotFoundException('Evento no encontrado');
    const ctx = {
      event: { id: event.id, title: event.title, slug: event.slug, startsAt: event.startsAt, endsAt: event.endsAt },
      installments,
      meals,
      formSchema: formRecord?.schema ?? null,
      ticket: ticket ? { amount: ticket.amount, currency: ticket.currency } : null,
    };
    const exporter = format === 'xlsx' ? this.xlsxExporter : this.csvExporter;
    return exporter.export(rows, ctx);
  }

  async exportCsv(eventId: string) {
    return this.export(eventId, 'csv');
  }

  async getMyRegistration(eventId: string, actor: any) {
    if (!actor.email) return null;
    return this.prisma.eventRegistration.findUnique({
      where: { eventId_email: { eventId, email: actor.email.toLowerCase() } },
    });
  }

  async listMyRegistrations(actor: any, scope: 'all' | 'upcoming' | 'past' = 'all') {
    if (!actor.email) return [];
    const now = new Date();
    return this.prisma.eventRegistration.findMany({
      where: {
        email: actor.email.toLowerCase(),
        status: { not: RegistrationStatus.CANCELLED },
        ...(scope === 'upcoming'
          ? { event: { startsAt: { gte: now } } }
          : scope === 'past'
            ? { event: { startsAt: { lt: now } } }
            : {}),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            location: true,
            modality: true,
            type: true,
            status: true,
            imageUrl: true,
            slug: true,
          },
        },
      },
      orderBy: { event: { startsAt: scope === 'past' ? 'desc' : 'asc' } },
    });
  }
}
