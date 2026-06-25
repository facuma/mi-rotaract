import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, ClubRole, MemberStatus, NotificationType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../auth/bcrypt-config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateTemporaryPassword } from './password-generator';
import { AssignClubDto, RemoveFromClubDto } from './dto/assign-club.dto';

const STALE_APPLICATION_DAYS = 7;

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx < 0) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1).trim() };
}

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async getAlerts() {
    const sevenDaysAgo = new Date(Date.now() - STALE_APPLICATION_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const [pendingApps, pendingAppsCount, allActiveClubs, activePresidencies, usersWithoutMembership, usersWithoutMembershipCount] =
      await Promise.all([
        this.prisma.membershipApplication.findMany({
          where: { status: ApplicationStatus.PENDING, createdAt: { lt: sevenDaysAgo } },
          include: {
            club: { select: { id: true, name: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 10,
        }),
        this.prisma.membershipApplication.count({
          where: { status: ApplicationStatus.PENDING, createdAt: { lt: sevenDaysAgo } },
        }),
        this.prisma.club.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } }),
        this.prisma.clubPresidency.findMany({ where: { status: 'ACTIVE' }, select: { clubId: true } }),
        this.prisma.user.findMany({
          where: {
            role: Role.PARTICIPANT,
            isActive: true,
            memberships: { none: { OR: [{ activeUntil: null }, { activeUntil: { gt: now } }] } },
          },
          select: { id: true, fullName: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.user.count({
          where: {
            role: Role.PARTICIPANT,
            isActive: true,
            memberships: { none: { OR: [{ activeUntil: null }, { activeUntil: { gt: now } }] } },
          },
        }),
      ]);
    const clubsWithPresidency = new Set(activePresidencies.map((p) => p.clubId));
    const clubsWithoutPresident = allActiveClubs.filter((c) => !clubsWithPresidency.has(c.id));
    return {
      pendingApplications: { count: pendingAppsCount, items: pendingApps, thresholdDays: STALE_APPLICATION_DAYS },
      clubsWithoutPresident: { count: clubsWithoutPresident.length, items: clubsWithoutPresident.slice(0, 10) },
      usersWithoutMembership: { count: usersWithoutMembershipCount, items: usersWithoutMembership },
    };
  }

  async listUsers(params?: { search?: string; hasClub?: boolean; role?: string; limit?: number }) {
    const now = new Date();
    const limit = Math.min(params?.limit ?? 100, 500);
    const search = params?.search?.trim();
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (params?.role) where.role = params.role;
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        memberships: {
          where: { OR: [{ activeUntil: null }, { activeUntil: { gt: now } }] },
          select: {
            id: true,
            clubId: true,
            clubRole: true,
            title: true,
            isPresident: true,
            activeFrom: true,
            club: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    if (params?.hasClub !== undefined)
      return users.filter((u) => (params.hasClub ? u.memberships.length > 0 : u.memberships.length === 0));
    return users;
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        memberships: { include: { club: { select: { id: true, name: true, code: true } } }, orderBy: { activeFrom: 'desc' } },
        memberProfiles: { include: { club: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const auditLog = await this.prisma.auditLog.findMany({
      where: { OR: [{ actorUserId: id }, { entityType: 'User', entityId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { user, auditLog };
  }

  async assignClub(targetUserId: string, dto: AssignClubDto, actorUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, fullName: true, email: true, isActive: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.isActive) throw new BadRequestException('El usuario está desactivado. Reactivalo antes de asignarle un club.');
    const club = await this.prisma.club.findUnique({ where: { id: dto.clubId }, select: { id: true, status: true, name: true } });
    if (!club || club.status !== 'ACTIVE') throw new NotFoundException('Club no disponible');
    const existingMembership = await this.prisma.membership.findFirst({ where: { userId: targetUserId, clubId: dto.clubId } });
    if (existingMembership) throw new ConflictException('El usuario ya pertenece a este club');
    const existingMember = await this.prisma.member.findFirst({ where: { clubId: dto.clubId, email: user.email, deletedAt: null } });
    if (existingMember) throw new ConflictException('Ya existe un socio con ese email en el club');
    const { firstName, lastName } = splitFullName(user.fullName);
    const { member, membership } = await this.prisma.$transaction(async (tx) => {
      const isPres = dto.clubRole === ClubRole.PRESIDENT;
      if (isPres) {
        await tx.member.updateMany({
          where: { clubId: dto.clubId, isPresident: true },
          data: { isPresident: false },
        });
        await tx.membership.updateMany({
          where: { clubId: dto.clubId, isPresident: true },
          data: { isPresident: false, clubRole: ClubRole.MEMBER },
        });
      }

      const m = await tx.member.create({
        data: {
          clubId: dto.clubId,
          userId: targetUserId,
          firstName,
          lastName,
          email: user.email,
          status: MemberStatus.ACTIVE,
          title: dto.title ?? (isPres ? 'Presidente' : null),
          isPresident: isPres,
          joinedAt: new Date(),
        },
      });
      const ms = await tx.membership.create({
        data: {
          userId: targetUserId,
          clubId: dto.clubId,
          clubRole: dto.clubRole ?? ClubRole.MEMBER,
          isPresident: isPres,
          title: dto.title ?? (isPres ? 'Presidente' : null),
        },
      });
      return { member: m, membership: ms };
    });
    await this.audit.log({
      clubId: dto.clubId,
      actorUserId,
      action: 'platform_admin.assign_club',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { clubId: dto.clubId, clubName: club.name, clubRole: dto.clubRole ?? ClubRole.MEMBER, membershipId: membership.id, memberId: member.id },
    });
    const presidents = await this.prisma.membership.findMany({ where: { clubId: dto.clubId, isPresident: true }, select: { userId: true } });
    await Promise.all(
      presidents
        .filter((p) => p.userId !== targetUserId)
        .map((p) =>
          this.notifications.create({
            userId: p.userId,
            type: NotificationType.ADMIN_ASSIGNED_TO_CLUB,
            title: 'Socio asignado por administrador',
            body: `${user.fullName} fue agregado/a como socio de ${club.name} por un administrador de la plataforma.`,
            data: { clubId: dto.clubId, userId: targetUserId, memberId: member.id },
          }),
        ),
    );
    return { member, membership };
  }

  async removeFromClub(targetUserId: string, dto: RemoveFromClubDto, actorUserId: string) {
    const membership = await this.prisma.membership.findFirst({ where: { userId: targetUserId, clubId: dto.clubId } });
    if (!membership) throw new NotFoundException('El usuario no pertenece a ese club');
    const member = await this.prisma.member.findFirst({ where: { clubId: dto.clubId, userId: targetUserId, deletedAt: null } });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.membership.update({ where: { id: membership.id }, data: { activeUntil: now } });
      if (member) {
        await tx.member.update({ where: { id: member.id }, data: { deletedAt: now, status: MemberStatus.INACTIVE } });
      }
    });
    await this.audit.log({
      clubId: dto.clubId,
      actorUserId,
      action: 'platform_admin.remove_from_club',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { clubId: dto.clubId, membershipId: membership.id },
    });
    return { ok: true };
  }

  async resetPassword(targetUserId: string, actorUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true, isActive: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash, mustChangePassword: true } });
    await this.prisma.passwordResetToken.updateMany({ where: { userId: targetUserId, usedAt: null }, data: { usedAt: new Date() } });
    await this.audit.log({ actorUserId, action: 'platform_admin.reset_password', entityType: 'User', entityId: targetUserId });
    return { temporaryPassword };
  }

  async deactivate(targetUserId: string, actorUserId: string) {
    if (targetUserId === actorUserId) throw new BadRequestException('No podés desactivarte a vos mismo');
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true, role: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role === Role.SUPERADMIN) throw new BadRequestException('No se puede desactivar a un SUPERADMIN');
    if (!user.isActive) throw new BadRequestException('El usuario ya está desactivado');
    await this.prisma.user.update({ where: { id: targetUserId }, data: { isActive: false } });
    await this.audit.log({ actorUserId, action: 'platform_admin.deactivate', entityType: 'User', entityId: targetUserId });
    return { ok: true };
  }

  async reactivate(targetUserId: string, actorUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, isActive: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.isActive) throw new BadRequestException('El usuario ya está activo');
    await this.prisma.user.update({ where: { id: targetUserId }, data: { isActive: true } });
    await this.audit.log({ actorUserId, action: 'platform_admin.reactivate', entityType: 'User', entityId: targetUserId });
    return { ok: true };
  }
}
