import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, ClubRole, MemberStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplicationsMailer } from './applications.mailer';
import { CreateMyApplicationDto } from './dto/create-my-application.dto';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx < 0) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1).trim() };
}

@Injectable()
export class MembershipApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mailer: ApplicationsMailer,
  ) {}

  async createForUser(userId: string, dto: CreateMyApplicationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, email: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const club = await this.prisma.club.findUnique({ where: { id: dto.clubId }, select: { id: true, status: true, name: true } });
    if (!club || club.status !== 'ACTIVE') throw new NotFoundException('Club no disponible');
    const activeMembership = await this.prisma.membership.findFirst({
      where: { userId, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] },
    });
    if (activeMembership) throw new ConflictException('Ya pertenecés a un club');
    const pending = await this.prisma.membershipApplication.findFirst({
      where: { userId, status: ApplicationStatus.PENDING },
    });
    if (pending) throw new ConflictException('Ya tenés una solicitud pendiente');
    const email = normalizeEmail(user.email);
    const existingMember = await this.prisma.member.findFirst({ where: { clubId: club.id, email, deletedAt: null } });
    if (existingMember) throw new ConflictException('Este email ya pertenece a un socio del club');
    const { firstName, lastName } = splitFullName(user.fullName);
    const app = await this.prisma.membershipApplication.create({
      data: {
        clubId: club.id,
        userId,
        firstName,
        lastName,
        email,
        message: dto.message?.trim() || null,
        status: ApplicationStatus.PENDING,
      },
    });
    await this.audit.log({
      clubId: club.id,
      actorUserId: userId,
      action: 'membership_application.created',
      entityType: 'MembershipApplication',
      entityId: app.id,
      metadata: { email },
    });
    await this.notifyPresidents(club.id, {
      title: 'Nueva solicitud de ingreso',
      body: `${user.fullName} solicitó ingresar a ${club.name}.`,
      applicantName: user.fullName,
      clubName: club.name,
      appId: app.id,
      message: app.message,
    });
    return app;
  }

  async getCurrentForUser(userId: string) {
    const pending = await this.prisma.membershipApplication.findFirst({
      where: { userId, status: ApplicationStatus.PENDING },
      include: { club: { select: { id: true, name: true } } },
    });
    if (pending) return pending;
    return this.prisma.membershipApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { club: { select: { id: true, name: true } } },
    });
  }

  async cancelForUser(userId: string, id: string) {
    const app = await this.prisma.membershipApplication.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException('Solicitud no encontrada');
    if (app.status !== ApplicationStatus.PENDING) throw new BadRequestException('La solicitud no está pendiente');
    const updated = await this.prisma.membershipApplication.update({
      where: { id: app.id },
      data: { status: ApplicationStatus.CANCELLED },
    });
    await this.audit.log({
      clubId: app.clubId,
      actorUserId: userId,
      action: 'membership_application.cancelled',
      entityType: 'MembershipApplication',
      entityId: app.id,
    });
    return updated;
  }

  async list(clubId: string, status?: string) {
    return this.prisma.membershipApplication.findMany({
      where: { clubId, ...(status ? { status: status as ApplicationStatus } : {}) },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async approve(id: string, clubId: string, actorUserId: string) {
    const app = await this.getPending(id, clubId);
    const email = normalizeEmail(app.email);
    const duplicate = await this.prisma.member.findFirst({ where: { clubId, email, deletedAt: null } });
    if (duplicate) throw new ConflictException('Ya existe un socio con ese email');
    const existingMembership = await this.prisma.membership.findFirst({ where: { userId: app.userId, clubId } });
    if (existingMembership) throw new ConflictException('El usuario ya tiene membresía en este club');
    const { member, club } = await this.prisma.$transaction(async (tx) => {
      const m = await tx.member.create({
        data: {
          clubId,
          userId: app.userId,
          firstName: app.firstName,
          lastName: app.lastName,
          email,
          phone: app.phone,
          status: MemberStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      await tx.membership.create({ data: { userId: app.userId, clubId, clubRole: ClubRole.MEMBER, isPresident: false } });
      await tx.membershipApplication.update({
        where: { id: app.id },
        data: { status: ApplicationStatus.APPROVED, reviewedById: actorUserId, reviewedAt: new Date(), memberId: m.id },
      });
      const clubRow = await tx.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } });
      return { member: m, club: clubRow };
    });
    await this.audit.log({
      clubId,
      actorUserId,
      action: 'membership_application.approved',
      entityType: 'MembershipApplication',
      entityId: app.id,
      metadata: { memberId: member.id, userId: app.userId },
    });
    const applicantName = `${app.firstName} ${app.lastName}`.trim() || email;
    await this.notifications.create({
      userId: app.userId,
      type: NotificationType.MEMBERSHIP_APPLICATION_APPROVED,
      title: `Tu solicitud a ${club!.name} fue aprobada`,
      body: `Ya tenés acceso completo como socio/a de ${club!.name}.`,
      data: { clubId, applicationId: app.id, memberId: member.id },
    });
    await this.mailer.sendApplicationApproved({ to: email, applicantName, clubName: club!.name });
    return member;
  }

  async reject(id: string, clubId: string, actorUserId: string, reason?: string) {
    const app = await this.getPending(id, clubId);
    const trimmedReason = reason?.trim() || null;
    const updated = await this.prisma.membershipApplication.update({
      where: { id: app.id },
      data: { status: ApplicationStatus.REJECTED, reviewedById: actorUserId, reviewedAt: new Date() },
    });
    await this.audit.log({
      clubId,
      actorUserId,
      action: 'membership_application.rejected',
      entityType: 'MembershipApplication',
      entityId: app.id,
      metadata: { reason: trimmedReason },
    });
    const club = await this.prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
    const applicantName = `${app.firstName} ${app.lastName}`.trim() || normalizeEmail(app.email);
    await this.notifications.create({
      userId: app.userId,
      type: NotificationType.MEMBERSHIP_APPLICATION_REJECTED,
      title: `Tu solicitud a ${club?.name ?? 'el club'} no fue aprobada`,
      body: trimmedReason ?? 'Podés elegir otro club.',
      data: { clubId, applicationId: app.id, reason: trimmedReason },
    });
    await this.mailer.sendApplicationRejected({
      to: normalizeEmail(app.email),
      applicantName,
      clubName: club?.name ?? 'el club',
      reason: trimmedReason,
    });
    return updated;
  }

  private async getPending(id: string, clubId: string) {
    const app = await this.prisma.membershipApplication.findFirst({ where: { id, clubId } });
    if (!app) throw new NotFoundException('Solicitud no encontrada');
    if (app.status !== ApplicationStatus.PENDING) throw new BadRequestException('La solicitud ya fue resuelta');
    return app;
  }

  private async notifyPresidents(
    clubId: string,
    params: { title: string; body: string; applicantName: string; clubName: string; appId: string; message?: string | null },
  ) {
    const presidents = await this.prisma.membership.findMany({
      where: { clubId, isPresident: true },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    for (const p of presidents) {
      if (!p.user) continue;
      await this.notifications.create({
        userId: p.user.id,
        type: NotificationType.MEMBERSHIP_APPLICATION_RECEIVED,
        title: params.title,
        body: params.body,
        data: { clubId, applicationId: params.appId },
      });
      await this.mailer.sendApplicationReceived({
        to: p.user.email,
        presidentName: p.user.fullName,
        applicantName: params.applicantName,
        clubName: params.clubName,
        message: params.message,
      });
    }
  }
}
