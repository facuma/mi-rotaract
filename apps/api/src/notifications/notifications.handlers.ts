import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvents } from '../events-bus/domain-events';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsHandlers {
  private readonly logger = new Logger(NotificationsHandlers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent(DomainEvents.RegistrationCreated, { async: true })
  async onRegistrationCreated(payload: { registrationId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: { select: { id: true, title: true, organizerId: true } } },
    });
    if (!reg) return;
    await this.notifications.create({
      userId: reg.event.organizerId,
      type: NotificationType.REGISTRATION_CREATED,
      title: `Nueva inscripción — ${reg.event.title}`,
      body: `${reg.fullName} se inscribió.`,
      eventId: reg.eventId,
      data: { registrationId: reg.id, fullName: reg.fullName },
    });
  }

  @OnEvent(DomainEvents.RegistrationWaitlistPromoted, { async: true })
  async onWaitlistPromoted(payload: { registrationId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: { select: { id: true, title: true } } },
    });
    if (!reg || !reg.userId) return;
    await this.notifications.create({
      userId: reg.userId,
      type: NotificationType.WAITLIST_PROMOTED,
      title: `Tu lugar en ${reg.event.title} quedó confirmado`,
      body: 'Se liberó un cupo y pasaste de lista de espera a confirmado.',
      eventId: reg.eventId,
      data: { registrationId: reg.id },
    });
  }

  @OnEvent(DomainEvents.PaymentRecorded, { async: true })
  async onPaymentRecorded(payload: { registrationId: string; paymentId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: { select: { id: true, title: true, organizerId: true } } },
    });
    if (!reg) return;
    await this.notifications.create({
      userId: reg.event.organizerId,
      type: NotificationType.PAYMENT_RECORDED,
      title: `Pago recibido — ${reg.event.title}`,
      body: `${reg.fullName} completó un pago.`,
      eventId: reg.eventId,
      data: { registrationId: reg.id, paymentId: payload.paymentId },
    });
  }

  @OnEvent(DomainEvents.EventCancelled, { async: true })
  async onEventCancelled(payload: { eventId: string; reason?: string }) {
    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        eventId: payload.eventId,
        userId: { not: null },
        status: { notIn: ['CANCELLED'] as any },
      },
      include: { event: { select: { title: true } } },
    });
    for (const reg of registrations) {
      if (!reg.userId) continue;
      await this.notifications.create({
        userId: reg.userId,
        type: NotificationType.EVENT_CANCELLED,
        title: `Cancelado: ${reg.event.title}`,
        body: payload.reason ?? 'El evento fue cancelado.',
        eventId: payload.eventId,
      });
    }
  }
}
