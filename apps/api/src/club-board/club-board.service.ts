import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpsertBoardDto } from './dto/upsert-board.dto';

@Injectable()
export class ClubBoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async resolvePeriodId(periodId?: string): Promise<string> {
    if (periodId) {
      const p = await this.prisma.districtPeriod.findUnique({ where: { id: periodId } });
      if (!p) throw new NotFoundException('Período no encontrado');
      return p.id;
    }
    const current = await this.prisma.districtPeriod.findFirst({ where: { isCurrent: true } });
    if (!current) throw new BadRequestException('No hay período distrital vigente');
    return current.id;
  }

  async list(clubId: string, periodId?: string) {
    const resolvedId = await this.resolvePeriodId(periodId);
    const positions = await this.prisma.clubBoardPosition.findMany({
      where: { clubId, periodId: resolvedId, endDate: null },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        period: true,
      },
      orderBy: [{ role: 'asc' }],
    });
    return { periodId: resolvedId, positions };
  }

  async upsert(clubId: string, dto: UpsertBoardDto, actorUserId: string) {
    const periodId = await this.resolvePeriodId(dto.periodId);
    const memberIds = dto.positions.map((p) => p.memberId);
    const uniqueMemberIds = new Set(memberIds);
    if (uniqueMemberIds.size !== memberIds.length) {
      throw new BadRequestException('Un socio no puede tener dos roles en la misma junta');
    }
    const uniqueRoles = new Set(dto.positions.map((p) => p.role));
    if (uniqueRoles.size !== dto.positions.length) {
      throw new BadRequestException('Cada rol debe asignarse a un único socio');
    }
    if (memberIds.length > 0) {
      const found = await this.prisma.member.count({
        where: { id: { in: memberIds }, clubId, deletedAt: null },
      });
      if (found !== memberIds.length) {
        throw new BadRequestException('Uno o más socios no pertenecen al club');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.clubBoardPosition.findMany({
        where: { clubId, periodId, endDate: null },
      });
      const desiredByRole = new Map<string, string>();
      for (const p of dto.positions) {
        desiredByRole.set(p.role, p.memberId);
      }
      const now = new Date();
      for (const pos of existing) {
        const desiredMember = desiredByRole.get(pos.role);
        if (desiredMember === pos.memberId) {
          desiredByRole.delete(pos.role);
          continue;
        }
        await tx.clubBoardPosition.update({
          where: { id: pos.id },
          data: { endDate: now },
        });
      }
      for (const [role, memberId] of desiredByRole) {
        await tx.clubBoardPosition.create({
          data: { clubId, periodId, role, memberId },
        });
      }
    });
    await this.audit.log({
      clubId,
      actorUserId,
      action: 'board.upserted',
      entityType: 'ClubBoardPosition',
      metadata: { periodId, positionCount: dto.positions.length },
    });
    return this.list(clubId, periodId);
  }
}
