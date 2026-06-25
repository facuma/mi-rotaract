import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClubPresidencyStatus, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PresidencyMailer } from './presidency.mailer';

const REMINDER_WINDOW_DAYS = 30;
const NO_SUCCESSOR_WARNING_DAYS = 60;

@Injectable()
export class ClubPresidencyService {
  private readonly logger = new Logger(ClubPresidencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: PresidencyMailer,
    private readonly notifications: NotificationsService,
  ) {}

  currentActive(clubId: string) {
    return this.prisma.clubPresidency.findFirst({
      where: { clubId, status: ClubPresidencyStatus.ACTIVE },
      include: { member: true, period: true },
    });
  }

  elect(clubId: string) {
    return this.prisma.clubPresidency.findFirst({
      where: { clubId, status: ClubPresidencyStatus.ELECTED },
      include: {
        member: true,
        period: true,
        electedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { electedAt: 'desc' },
    });
  }

  history(clubId: string) {
    return this.prisma.clubPresidency.findMany({
      where: { clubId },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        period: true,
      },
      orderBy: [{ startDate: 'desc' }, { electedAt: 'desc' }],
    });
  }

  async designatablePeriods() {
    const currentPeriod = await this.prisma.districtPeriod.findFirst({
      where: { isCurrent: true },
    });
    return this.prisma.districtPeriod.findMany({
      where: currentPeriod ? { startDate: { gt: currentPeriod.startDate } } : {},
      orderBy: { startDate: 'asc' },
      take: 10,
    });
  }

  async upsertActiveFromAssignment(
    tx: any,
    params: { clubId: string; memberId: string; actorUserId: string },
  ) {
    const period = await tx.districtPeriod.findFirst({
      where: { isCurrent: true },
      select: { id: true, startDate: true },
    });
    if (!period) {
      await tx.auditLog.create({
        data: {
          clubId: params.clubId,
          actorUserId: params.actorUserId,
          action: 'presidency.dualwrite_skipped',
          entityType: 'Member',
          entityId: params.memberId,
          metadataJson: JSON.stringify({ reason: 'no_current_district_period' }),
        },
      });
      return;
    }
    const now = new Date();
    await tx.clubPresidency.updateMany({
      where: {
        clubId: params.clubId,
        status: ClubPresidencyStatus.ACTIVE,
        NOT: { memberId: params.memberId },
      },
      data: { status: ClubPresidencyStatus.ENDED, endDate: now },
    });
    const existing = await tx.clubPresidency.findFirst({
      where: {
        clubId: params.clubId,
        memberId: params.memberId,
        periodId: period.id,
        status: { in: [ClubPresidencyStatus.ACTIVE, ClubPresidencyStatus.ELECTED] },
      },
      select: { id: true, status: true },
    });
    if (existing) {
      if (existing.status !== ClubPresidencyStatus.ACTIVE) {
        await tx.clubPresidency.update({
          where: { id: existing.id },
          data: { status: ClubPresidencyStatus.ACTIVE, startDate: now },
        });
      }
      return;
    }
    await tx.clubPresidency.create({
      data: {
        clubId: params.clubId,
        memberId: params.memberId,
        periodId: period.id,
        status: ClubPresidencyStatus.ACTIVE,
        startDate: now,
        electedById: params.actorUserId,
      },
    });
  }

  async designateSuccessor(params: {
    clubId: string;
    memberId: string;
    periodId: string;
    actorUserId: string;
  }) {
    const { clubId, memberId, periodId, actorUserId } = params;
    const [member, period, currentPeriod] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: memberId, clubId, deletedAt: null },
        include: { club: { select: { id: true, name: true } } },
      }),
      this.prisma.districtPeriod.findUnique({ where: { id: periodId } }),
      this.prisma.districtPeriod.findFirst({ where: { isCurrent: true } }),
    ]);
    if (!member) throw new NotFoundException('Socio no encontrado en el club');
    if (!period) throw new NotFoundException('Período no encontrado');
    if (!currentPeriod)
      throw new BadRequestException('No hay período distrital vigente; no se puede designar sucesor');
    if (period.startDate <= currentPeriod.startDate)
      throw new BadRequestException('El período del sucesor debe ser posterior al actual');

    const revoked = await this.prisma.clubPresidency.updateMany({
      where: {
        clubId,
        periodId,
        status: ClubPresidencyStatus.ELECTED,
        NOT: { memberId },
      },
      data: { status: ClubPresidencyStatus.REVOKED, endDate: new Date() },
    });
    const existing = await this.prisma.clubPresidency.findFirst({
      where: { clubId, periodId, memberId, status: ClubPresidencyStatus.ELECTED },
      select: { id: true },
    });
    const presidency = existing
      ? await this.prisma.clubPresidency.update({
          where: { id: existing.id },
          data: { electedById: actorUserId, electedAt: new Date() },
          include: { member: true, period: true },
        })
      : await this.prisma.clubPresidency.create({
          data: {
            clubId,
            memberId,
            periodId,
            status: ClubPresidencyStatus.ELECTED,
            electedById: actorUserId,
          },
          include: { member: true, period: true },
        });

    await this.audit.log({
      clubId,
      actorUserId,
      action: 'presidency.successor_designated',
      entityType: 'ClubPresidency',
      entityId: presidency.id,
      metadata: { memberId, periodId, replacedElectedCount: revoked.count },
    });
    await this.mailer.sendDesignation(presidency, member.club.name);
    if (presidency.member.userId) {
      await this.notifications.create({
        userId: presidency.member.userId,
        type: NotificationType.PRESIDENCY_DESIGNATED,
        title: `Fuiste designado/a presidente de ${member.club.name}`,
        body: `Período ${presidency.period.name}. Transición efectiva el ${presidency.period.startDate.toLocaleDateString('es-AR')}.`,
        data: { clubId, periodId, presidencyId: presidency.id },
      });
    }
    return presidency;
  }

  async revoke(params: { id: string; clubId: string; actorUserId: string }) {
    const presidency = await this.prisma.clubPresidency.findFirst({
      where: { id: params.id, clubId: params.clubId },
      include: { member: true, period: true },
    });
    if (!presidency) throw new NotFoundException('Designación no encontrada');
    if (presidency.status !== ClubPresidencyStatus.ELECTED)
      throw new BadRequestException('Sólo se pueden revocar designaciones en estado ELECTED');

    const updated = await this.prisma.clubPresidency.update({
      where: { id: presidency.id },
      data: { status: ClubPresidencyStatus.REVOKED, endDate: new Date() },
      include: { member: true, period: true },
    });
    await this.audit.log({
      clubId: params.clubId,
      actorUserId: params.actorUserId,
      action: 'presidency.revoked',
      entityType: 'ClubPresidency',
      entityId: updated.id,
      metadata: { memberId: updated.memberId, periodId: updated.periodId },
    });
    await this.mailer.sendRevoked(updated);
    if (updated.member.userId) {
      await this.notifications.create({
        userId: updated.member.userId,
        type: NotificationType.PRESIDENCY_REVOKED,
        title: 'Designación de presidente revocada',
        body: `Tu designación como presidente electo para el período ${updated.period.name} fue revocada.`,
        data: { clubId: updated.clubId, periodId: updated.periodId, presidencyId: updated.id },
      });
    }
    return updated;
  }

  async handleMemberSoftDeleted(params: { memberId: string; clubId: string; actorUserId: string }) {
    const elected = await this.prisma.clubPresidency.findFirst({
      where: {
        memberId: params.memberId,
        clubId: params.clubId,
        status: ClubPresidencyStatus.ELECTED,
      },
      include: { member: true, period: true },
    });
    if (!elected) return;
    const updated = await this.prisma.clubPresidency.update({
      where: { id: elected.id },
      data: { status: ClubPresidencyStatus.REVOKED, endDate: new Date() },
      include: { member: true, period: true },
    });
    await this.audit.log({
      clubId: params.clubId,
      actorUserId: params.actorUserId,
      action: 'presidency.revoked_by_member_deletion',
      entityType: 'ClubPresidency',
      entityId: updated.id,
      metadata: { memberId: params.memberId },
    });
    await this.mailer.sendRevoked(updated);
    if (updated.member.userId) {
      await this.notifications.create({
        userId: updated.member.userId,
        type: NotificationType.PRESIDENCY_REVOKED,
        title: 'Designación de presidente revocada',
        body: `Tu designación como presidente electo para el período ${updated.period.name} fue revocada.`,
        data: { clubId: updated.clubId, periodId: updated.periodId, presidencyId: updated.id },
      });
    }
  }

  async runPresidencyTransition(now = new Date()) {
    const currentPeriod = await this.prisma.districtPeriod.findFirst({ where: { isCurrent: true } });
    if (!currentPeriod) {
      this.logger.warn('runPresidencyTransition: no current district period');
      return { activated: 0, extended: 0 };
    }
    const electeds = await this.prisma.clubPresidency.findMany({
      where: { status: ClubPresidencyStatus.ELECTED, periodId: currentPeriod.id },
      include: { member: true, period: true },
    });
    let activated = 0;
    for (const next of electeds) {
      try {
        const outgoingPresidencies = await this.prisma.clubPresidency.findMany({
          where: {
            clubId: next.clubId,
            status: ClubPresidencyStatus.ACTIVE,
            NOT: { id: next.id },
          },
          include: { member: { select: { userId: true } } },
        });
        await this.prisma.$transaction(async (tx) => {
          await tx.clubPresidency.updateMany({
            where: {
              clubId: next.clubId,
              status: ClubPresidencyStatus.ACTIVE,
              NOT: { id: next.id },
            },
            data: { status: ClubPresidencyStatus.ENDED, endDate: now },
          });
          await tx.clubPresidency.update({
            where: { id: next.id },
            data: { status: ClubPresidencyStatus.ACTIVE, startDate: now },
          });
          await this.recomputeLegacyFlags(tx, next.clubId, next.memberId);
          await tx.club.updateMany({
            where: { id: next.clubId, presidencyExtended: true },
            data: { presidencyExtended: false },
          });
        });
        activated++;
        await this.audit.log({
          clubId: next.clubId,
          action: 'presidency.transition_activated',
          entityType: 'ClubPresidency',
          entityId: next.id,
          metadata: { memberId: next.memberId, periodId: next.periodId },
        });
        await this.mailer.sendTransition(next);
        const recipients: string[] = [];
        if (next.member.userId) recipients.push(next.member.userId);
        for (const out of outgoingPresidencies) {
          if (out.member.userId) recipients.push(out.member.userId);
        }
        if (recipients.length > 0) {
          await this.notifications.createMany(
            recipients.map((userId) => ({
              userId,
              type: NotificationType.PRESIDENCY_TRANSITION,
              title: 'Transición de presidencia efectiva',
              body: `Hoy comienza el período ${next.period.name}.`,
              data: { clubId: next.clubId, periodId: next.periodId, presidencyId: next.id },
            })),
          );
        }
      } catch (err) {
        this.logger.error(
          `transition failed for presidency ${next.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    const extended = await this.markClubsWithoutSuccessorAsExtended(currentPeriod.id, now);
    return { activated, extended };
  }

  async notifySuccessionStatus(now = new Date()) {
    const currentPeriod = await this.prisma.districtPeriod.findFirst({ where: { isCurrent: true } });
    if (!currentPeriod) return { reminders: 0, warnings: 0 };
    const nextPeriod = await this.prisma.districtPeriod.findFirst({
      where: { startDate: { gt: currentPeriod.endDate } },
      orderBy: { startDate: 'asc' },
    });
    if (!nextPeriod) return { reminders: 0, warnings: 0 };

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysToChange = Math.ceil((nextPeriod.startDate.getTime() - now.getTime()) / msPerDay);
    let reminders = 0;
    let warnings = 0;

    if (daysToChange <= REMINDER_WINDOW_DAYS && daysToChange > 0) {
      const electeds = await this.prisma.clubPresidency.findMany({
        where: { status: ClubPresidencyStatus.ELECTED, periodId: nextPeriod.id },
        include: { member: true, period: true },
      });
      for (const e of electeds) {
        try {
          await this.mailer.sendReminder30d(e);
          if (e.member.userId) {
            await this.notifications.create({
              userId: e.member.userId,
              type: NotificationType.PRESIDENCY_REMINDER,
              title: `Tu presidencia comienza en ${daysToChange} días`,
              body: `El período ${e.period.name} empieza el ${e.period.startDate.toLocaleDateString('es-AR')}. Coordiná la transición con el presidente saliente.`,
              data: { clubId: e.clubId, periodId: e.periodId, presidencyId: e.id },
            });
          }
          reminders++;
        } catch (err) {
          this.logger.error(
            `reminder_30d failed for presidency ${e.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    if (daysToChange <= NO_SUCCESSOR_WARNING_DAYS && daysToChange > 0) {
      const clubsWithoutElect = await this.prisma.club.findMany({
        where: {
          status: 'ACTIVE',
          presidencies: {
            none: { status: ClubPresidencyStatus.ELECTED, periodId: nextPeriod.id },
          },
        },
        include: {
          presidencies: {
            where: { status: ClubPresidencyStatus.ACTIVE },
            include: { member: true },
            take: 1,
          },
        },
      });
      const dsUsers = await this.prisma.user.findMany({
        where: { role: Role.SECRETARY, isActive: true },
        select: { id: true },
      });
      for (const club of clubsWithoutElect) {
        const current = club.presidencies[0];
        if (!current) continue;
        try {
          await this.mailer.sendNoSuccessorWarning({
            club,
            current,
            daysToChange,
            periodName: nextPeriod.name,
          });
          const recipients: string[] = [];
          if (current.member.userId) recipients.push(current.member.userId);
          for (const ds of dsUsers) recipients.push(ds.id);
          if (recipients.length > 0) {
            await this.notifications.createMany(
              recipients.map((userId) => ({
                userId,
                type: NotificationType.PRESIDENCY_NO_SUCCESSOR,
                title: `${club.name} no tiene sucesor designado`,
                body: `Quedan ${daysToChange} días para el cambio al período ${nextPeriod.name}. Designá un sucesor o el club quedará en extensión.`,
                data: { clubId: club.id, periodId: nextPeriod.id },
              })),
            );
          }
          warnings++;
        } catch (err) {
          this.logger.error(
            `no_successor warning failed for club ${club.id}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
    return { reminders, warnings };
  }

  async markClubsWithoutSuccessorAsExtended(currentPeriodId: string, now: Date) {
    const stale = await this.prisma.clubPresidency.findMany({
      where: { status: ClubPresidencyStatus.ACTIVE, NOT: { periodId: currentPeriodId } },
      include: { club: { select: { id: true, presidencyExtended: true } } },
    });
    let extended = 0;
    for (const pres of stale) {
      const hasSuccessor = await this.prisma.clubPresidency.count({
        where: {
          clubId: pres.clubId,
          periodId: currentPeriodId,
          status: { in: [ClubPresidencyStatus.ELECTED, ClubPresidencyStatus.ACTIVE] },
        },
      });
      if (hasSuccessor > 0) continue;
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.clubPresidency.update({
            where: { id: pres.id },
            data: { periodId: currentPeriodId, status: ClubPresidencyStatus.ACTIVE, startDate: now },
          });
          if (!pres.club.presidencyExtended) {
            await tx.club.update({
              where: { id: pres.clubId },
              data: { presidencyExtended: true },
            });
          }
        });
        await this.audit.log({
          clubId: pres.clubId,
          action: 'presidency.extended_no_successor',
          entityType: 'ClubPresidency',
          entityId: pres.id,
          metadata: { memberId: pres.memberId, periodId: currentPeriodId },
        });
        extended++;
      } catch (err) {
        this.logger.error(
          `extend failed for club ${pres.clubId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return extended;
  }

  async recomputeLegacyFlags(tx: any, clubId: string, newPresidentMemberId: string) {
    await tx.member.updateMany({
      where: { clubId, isPresident: true, NOT: { id: newPresidentMemberId } },
      data: { isPresident: false },
    });
    await tx.member.update({
      where: { id: newPresidentMemberId },
      data: { isPresident: true, title: 'Presidente' },
    });
    const member = await tx.member.findUnique({
      where: { id: newPresidentMemberId },
      select: { userId: true },
    });
    if (!member?.userId) return;
    await tx.membership.updateMany({
      where: { clubId, isPresident: true, NOT: { userId: member.userId } },
      data: { isPresident: false, clubRole: 'MEMBER' },
    });
    await tx.membership.upsert({
      where: { userId_clubId: { userId: member.userId, clubId } },
      update: { isPresident: true, title: 'Presidente', clubRole: 'PRESIDENT' },
      create: {
        userId: member.userId,
        clubId,
        isPresident: true,
        title: 'Presidente',
        clubRole: 'PRESIDENT',
      },
    });
  }
}
