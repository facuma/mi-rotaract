import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTransferRequestDto } from './dto/create-transfer.dto';

@Injectable()
export class TransferRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, fromClubId: string, dto: CreateTransferRequestDto) {
    if (dto.toClubId === fromClubId) throw new BadRequestException('El club destino no puede ser el mismo');
    const toClub = await this.prisma.club.findUnique({ where: { id: dto.toClubId }, select: { id: true, status: true } });
    if (!toClub || toClub.status !== 'ACTIVE') throw new NotFoundException('Club destino no disponible');
    const member = await this.prisma.member.findFirst({ where: { userId, clubId: fromClubId, deletedAt: null } });
    if (!member) throw new NotFoundException('No tenés registro de socio en este club');
    const existing = await this.prisma.memberTransferRequest.findFirst({
      where: {
        memberId: member.id,
        status: { in: [TransferStatus.REQUESTED, TransferStatus.ACCEPTED_BY_DESTINATION, TransferStatus.CONFIRMED_BY_ORIGIN] },
      },
    });
    if (existing) throw new ConflictException('Ya tenés una solicitud de transferencia en curso');
    const req = await this.prisma.memberTransferRequest.create({
      data: { memberId: member.id, fromClubId, toClubId: dto.toClubId, reason: dto.reason?.trim() || null },
    });
    await this.audit.log({
      clubId: fromClubId,
      actorUserId: userId,
      action: 'transfer.requested',
      entityType: 'MemberTransferRequest',
      entityId: req.id,
      metadata: { toClubId: dto.toClubId, memberId: member.id },
    });
    return req;
  }

  async list(clubId: string) {
    return this.prisma.memberTransferRequest.findMany({
      where: { OR: [{ fromClubId: clubId }, { toClubId: clubId }] },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
        fromClub: { select: { id: true, name: true, code: true } },
        toClub: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ requestedAt: 'desc' }],
    });
  }

  async accept(id: string, actorClubId: string, actorUserId: string) {
    const t = await this.getOpen(id);
    if (t.toClubId !== actorClubId) throw new ForbiddenException('Solo la autoridad del club destino puede aceptar');
    if (t.status !== TransferStatus.REQUESTED) throw new BadRequestException('La solicitud no está en estado REQUESTED');
    const updated = await this.prisma.memberTransferRequest.update({
      where: { id: t.id },
      data: { status: TransferStatus.ACCEPTED_BY_DESTINATION, acceptedById: actorUserId, acceptedAt: new Date() },
    });
    await this.audit.log({
      clubId: actorClubId,
      actorUserId,
      action: 'transfer.accepted_by_destination',
      entityType: 'MemberTransferRequest',
      entityId: t.id,
    });
    return updated;
  }

  async confirm(id: string, actorClubId: string, actorUserId: string) {
    const t = await this.getOpen(id);
    if (t.fromClubId !== actorClubId) throw new ForbiddenException('Solo la autoridad del club origen puede confirmar');
    if (t.status !== TransferStatus.ACCEPTED_BY_DESTINATION) throw new BadRequestException('La solicitud no está aceptada por el destino');
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const source = await tx.member.findUnique({ where: { id: t.memberId } });
      if (!source) throw new NotFoundException('Socio de origen ya no existe');
      const duplicate = await tx.member.findFirst({ where: { clubId: t.toClubId, email: source.email, deletedAt: null } });
      if (duplicate) throw new ConflictException('Ya existe un socio con ese email en el club destino');
      await tx.member.create({
        data: {
          clubId: t.toClubId,
          userId: source.userId,
          firstName: source.firstName,
          lastName: source.lastName,
          email: source.email,
          phone: source.phone,
          birthDate: source.birthDate,
          joinedAt: now,
          status: MemberStatus.ACTIVE,
        },
      });
      await tx.member.update({
        where: { id: source.id },
        data: { deletedAt: now, email: `__transferred_${source.id}_${now.getTime()}@transferred.local` },
      });
      return tx.memberTransferRequest.update({
        where: { id: t.id },
        data: { status: TransferStatus.COMPLETED, confirmedById: actorUserId, confirmedAt: now, completedAt: now },
      });
    });
    await this.audit.log({
      clubId: actorClubId,
      actorUserId,
      action: 'transfer.completed',
      entityType: 'MemberTransferRequest',
      entityId: t.id,
      metadata: { toClubId: t.toClubId, memberId: t.memberId },
    });
    return result;
  }

  async reject(id: string, actorClubId: string, actorUserId: string, reason?: string) {
    const t = await this.getOpen(id);
    if (t.fromClubId !== actorClubId && t.toClubId !== actorClubId)
      throw new ForbiddenException('No tenés permiso para rechazar esta transferencia');
    if (t.status !== TransferStatus.REQUESTED && t.status !== TransferStatus.ACCEPTED_BY_DESTINATION)
      throw new BadRequestException('La solicitud ya fue resuelta');
    const updated = await this.prisma.memberTransferRequest.update({
      where: { id: t.id },
      data: { status: TransferStatus.REJECTED, rejectedById: actorUserId, rejectedAt: new Date(), reason: reason?.trim() || t.reason },
    });
    await this.audit.log({
      clubId: actorClubId,
      actorUserId,
      action: 'transfer.rejected',
      entityType: 'MemberTransferRequest',
      entityId: t.id,
      metadata: { reason: reason?.trim() || null },
    });
    return updated;
  }

  async getOpen(id: string) {
    const t = await this.prisma.memberTransferRequest.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Solicitud no encontrada');
    return t;
  }
}
