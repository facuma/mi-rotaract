import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailTemplateType, EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmailsService } from '../event-emails/event-emails.service';
import { EventCheckInService } from '../event-check-in/event-check-in.service';
import { DomainEvents } from '../events-bus/domain-events';

@Injectable()
export class EventRegistrationsHandlers {
  private readonly logger = new Logger(EventRegistrationsHandlers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EventEmailsService,
    private readonly checkIn: EventCheckInService,
  ) {}

  @OnEvent(DomainEvents.RegistrationConfirmed, { async: true })
  async onConfirmed(payload: { registrationId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: true },
    });
    if (!reg) return;
    await this.sendWithQr(EmailTemplateType.REGISTRATION_CONFIRMATION, reg);
  }

  @OnEvent(DomainEvents.RegistrationWaitlistPromoted, { async: true })
  async onWaitlistPromoted(payload: { registrationId: string }) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: payload.registrationId },
      include: { event: true },
    });
    if (!reg) return;
    await this.sendWithQr(EmailTemplateType.WAITLIST_PROMOTED, reg);
  }

  private async sendWithQr(type: EmailTemplateType, reg: any) {
    const token = await this.checkIn.ensureToken(reg.id);
    const png = await this.checkIn.renderQrPng(token);
    const checkInUrl = this.checkIn.tokenUrl(token);
    await this.emails.sendForRegistration(type, reg.event, reg, { checkInUrl }, [
      { filename: 'qr-acreditacion.png', content: png, contentType: 'image/png' },
    ]);
  }

  @OnEvent(DomainEvents.EventCancelled, { async: true })
  async onEventCancelled(payload: { eventId: string }) {
    const event = await this.prisma.event.findUnique({ where: { id: payload.eventId } });
    if (!event || event.status !== EventStatus.CANCELLED) return;
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId: payload.eventId, status: { not: 'CANCELLED' } },
    });
    this.logger.log(`event ${event.id} cancelled, notifying ${registrations.length} attendees`);
    for (const reg of registrations) {
      await this.emails.sendForRegistration(EmailTemplateType.EVENT_CANCELLED, event, reg);
    }
  }
}
