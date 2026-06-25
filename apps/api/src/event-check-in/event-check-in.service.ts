import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckInResult,
  EventStatus,
  RegistrationStatus,
  Role,
} from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';
import { generateCheckInToken, verifyCheckInToken } from './check-in-token';

const HUMAN_RESULT: Record<string, string> = {
  CHECKED_IN: 'Bienvenido/a',
  ALREADY_CHECKED_IN: 'Ya acreditado',
  INVALID_TOKEN: 'QR inválido',
  WRONG_EVENT: 'QR de otro evento',
  REGISTRATION_CANCELLED: 'Inscripción cancelada',
  PAYMENT_PENDING: 'Pago no confirmado',
  EVENT_NOT_OPEN: 'Evento no abierto para check-in',
  FORBIDDEN: 'Sin permiso',
};

@Injectable()
export class EventCheckInService {
  private readonly logger = new Logger(EventCheckInService.name);
  private readonly appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventsBusService,
  ) {}

  async ensureToken(registrationId: string): Promise<string> {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, checkInToken: true },
    });
    if (!reg) throw new NotFoundException('Inscripción no encontrada');
    if (reg.checkInToken && verifyCheckInToken(reg.checkInToken)) {
      return reg.checkInToken;
    }
    const token = generateCheckInToken();
    await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { checkInToken: token },
    });
    return token;
  }

  async renderQrPng(token: string): Promise<Buffer> {
    return QRCode.toBuffer(this.tokenUrl(token), { type: 'png', margin: 1, width: 360 });
  }

  async renderQrSvg(token: string): Promise<string> {
    return QRCode.toString(this.tokenUrl(token), { type: 'svg', margin: 1 });
  }

  async renderQrDataUrl(token: string): Promise<string> {
    return QRCode.toDataURL(this.tokenUrl(token), { margin: 1, width: 360 });
  }

  tokenUrl(token: string): string {
    return `${this.appBaseUrl}/r/${encodeURIComponent(token)}`;
  }

  async resolvePublic(token: string) {
    if (!verifyCheckInToken(token)) throw new NotFoundException('Token inválido');
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { checkInToken: token },
      include: { event: true },
    });
    if (!reg) throw new NotFoundException('Inscripción no encontrada');
    return {
      token,
      registration: {
        id: reg.id,
        fullName: reg.fullName,
        status: reg.status,
        checkedInAt: reg.checkedInAt,
      },
      event: {
        id: reg.event.id,
        title: reg.event.title,
        startsAt: reg.event.startsAt,
        location: reg.event.location,
        modality: reg.event.modality,
      },
    };
  }

  async checkIn(
    eventId: string,
    rawToken: string,
    actor: { id: string; role: string },
    deviceInfo?: string,
  ) {
    await this.assertCanScan(eventId, actor);
    if (!verifyCheckInToken(rawToken)) {
      await this.persistLog(eventId, null, rawToken, CheckInResult.INVALID_TOKEN, actor.id, deviceInfo);
      return { result: CheckInResult.INVALID_TOKEN, message: HUMAN_RESULT.INVALID_TOKEN };
    }
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { checkInToken: rawToken },
      include: { event: true },
    });
    if (!reg) {
      await this.persistLog(eventId, null, rawToken, CheckInResult.INVALID_TOKEN, actor.id, deviceInfo);
      return { result: CheckInResult.INVALID_TOKEN, message: HUMAN_RESULT.INVALID_TOKEN };
    }
    if (reg.eventId !== eventId) {
      await this.persistLog(eventId, reg.id, rawToken, CheckInResult.WRONG_EVENT, actor.id, deviceInfo);
      return { result: CheckInResult.WRONG_EVENT, message: HUMAN_RESULT.WRONG_EVENT };
    }
    if (reg.status === RegistrationStatus.CANCELLED) {
      await this.persistLog(eventId, reg.id, rawToken, CheckInResult.REGISTRATION_CANCELLED, actor.id, deviceInfo);
      return { result: CheckInResult.REGISTRATION_CANCELLED, registration: this.publicReg(reg), message: HUMAN_RESULT.REGISTRATION_CANCELLED };
    }
    if (reg.status === RegistrationStatus.PENDING_PAYMENT) {
      await this.persistLog(eventId, reg.id, rawToken, CheckInResult.PAYMENT_PENDING, actor.id, deviceInfo);
      return { result: CheckInResult.PAYMENT_PENDING, registration: this.publicReg(reg), message: HUMAN_RESULT.PAYMENT_PENDING };
    }
    if (reg.event.status === EventStatus.CANCELLED) {
      await this.persistLog(eventId, reg.id, rawToken, CheckInResult.EVENT_NOT_OPEN, actor.id, deviceInfo);
      return { result: CheckInResult.EVENT_NOT_OPEN, registration: this.publicReg(reg), message: HUMAN_RESULT.EVENT_NOT_OPEN };
    }
    if (reg.checkedInAt) {
      await this.persistLog(eventId, reg.id, rawToken, CheckInResult.ALREADY_CHECKED_IN, actor.id, deviceInfo);
      return { result: CheckInResult.ALREADY_CHECKED_IN, registration: this.publicReg(reg), message: HUMAN_RESULT.ALREADY_CHECKED_IN };
    }
    const updated = await this.prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { checkedInAt: new Date(), checkedInById: actor.id, status: RegistrationStatus.CONFIRMED },
    });
    await this.persistLog(eventId, reg.id, rawToken, CheckInResult.CHECKED_IN, actor.id, deviceInfo);
    await this.audit.log({
      actorUserId: actor.id,
      action: 'checkin.performed',
      entityType: 'event_registration',
      entityId: reg.id,
      metadata: { eventId },
    });
    this.bus.emit(DomainEvents.CheckInPerformed, { registrationId: reg.id, eventId, scannedById: actor.id });
    return { result: CheckInResult.CHECKED_IN, registration: this.publicReg(updated), message: HUMAN_RESULT.CHECKED_IN };
  }

  async undo(eventId: string, registrationId: string, actor: { id: string }, reason?: string) {
    await this.assertCanScan(eventId, actor as any);
    const reg = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!reg || reg.eventId !== eventId) throw new NotFoundException('Inscripción no encontrada');
    if (!reg.checkedInAt) return { registration: this.publicReg(reg) };
    const updated = await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { checkedInAt: null, checkedInById: null },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'checkin.undone',
      entityType: 'event_registration',
      entityId: registrationId,
      metadata: { eventId, reason },
    });
    return { registration: this.publicReg(updated) };
  }

  async stats(eventId: string) {
    const [totalConfirmed, checkedIn, lastCheckIns] = await Promise.all([
      this.prisma.eventRegistration.count({
        where: { eventId, status: { in: [RegistrationStatus.CONFIRMED, RegistrationStatus.PENDING_PAYMENT] } },
      }),
      this.prisma.eventRegistration.count({ where: { eventId, checkedInAt: { not: null } } }),
      this.prisma.eventRegistration.findMany({
        where: { eventId, checkedInAt: { not: null } },
        orderBy: { checkedInAt: 'desc' },
        take: 10,
        select: { id: true, fullName: true, checkedInAt: true },
      }),
    ]);
    const remaining = Math.max(0, totalConfirmed - checkedIn);
    return {
      totalConfirmed,
      checkedIn,
      remaining,
      checkInRate: totalConfirmed > 0 ? checkedIn / totalConfirmed : 0,
      lastCheckIns: lastCheckIns.map((r) => ({ id: r.id, fullName: r.fullName, at: r.checkedInAt })),
    };
  }

  async assertCanScan(eventId: string, actor: { id: string; role: string }) {
    if (actor.role === Role.SECRETARY) return;
    if (actor.role === Role.PRESIDENT || actor.role === Role.RDR) {
      const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { clubId: true } });
      if (event?.clubId) {
        const memberships = await this.prisma.membership.findMany({
          where: { userId: actor.id, isPresident: true },
          select: { clubId: true },
        });
        if (memberships.some((m) => m.clubId === event.clubId)) return;
      }
    }
    throw new ForbiddenException('Sin permiso para acreditar en este evento');
  }

  publicReg(reg: any) {
    return { id: reg.id, fullName: reg.fullName, email: reg.email, checkedInAt: reg.checkedInAt };
  }

  async persistLog(
    eventId: string,
    registrationId: string | null,
    token: string,
    result: CheckInResult,
    scannedById: string,
    deviceInfo?: string,
  ) {
    return this.prisma.eventCheckInLog.create({
      data: { eventId, registrationId: registrationId ?? undefined, token, result, scannedById, deviceInfo },
    });
  }
}
