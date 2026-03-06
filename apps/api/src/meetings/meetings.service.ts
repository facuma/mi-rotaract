import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MeetingStatus, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AssignParticipantsDto } from './dto/assign-participants.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(dto: CreateMeetingDto, createdById: string) {
    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: MeetingStatus.DRAFT,
        createdById,
        clubId: dto.clubId,
      },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: meeting.id,
      actorUserId: createdById,
      action: 'meeting.created',
      entityType: 'Meeting',
      entityId: meeting.id,
    });
    return meeting;
  }

  async findAll(userId: string, role: Role) {
    if (role === Role.SECRETARY || role === Role.PRESIDENT) {
      return this.prisma.meeting.findMany({
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        include: { club: true },
      });
    }
    return this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        status: { not: MeetingStatus.DRAFT },
      },
      orderBy: [{ scheduledAt: 'desc' }],
      include: { club: true },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { club: true, participants: { include: { user: true } } },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (role !== Role.SECRETARY && role !== Role.PRESIDENT) {
      const isParticipant = meeting.participants.some((p) => p.userId === userId);
      if (!isParticipant && meeting.status !== MeetingStatus.DRAFT)
        throw new NotFoundException('No tenés acceso a esta reunión');
    }
    return meeting;
  }

  async update(id: string, dto: UpdateMeetingDto, actorUserId: string) {
    await this.assertMeetingExists(id);
    const meeting = await this.prisma.meeting.update({
      where: { id },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
      },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.updated',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return meeting;
  }

  async start(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.SCHEDULED && meeting.status !== MeetingStatus.DRAFT)
      throw new BadRequestException('Solo se puede iniciar una reunión programada o en borrador');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.LIVE, startedAt: new Date() },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.started',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async pause(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.LIVE)
      throw new BadRequestException('Solo se puede pausar una reunión en vivo');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.PAUSED },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.paused',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async resume(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.PAUSED)
      throw new BadRequestException('Solo se puede reanudar una reunión pausada');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.LIVE },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.resumed',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async finish(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.LIVE && meeting.status !== MeetingStatus.PAUSED)
      throw new BadRequestException('Solo se puede finalizar una reunión en vivo o pausada');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.FINISHED, endedAt: new Date() },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.finished',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async schedule(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.DRAFT)
      throw new BadRequestException('Solo se puede programar un borrador');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { status: MeetingStatus.SCHEDULED },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.updated',
      entityType: 'Meeting',
      entityId: id,
      metadata: { transition: 'schedule' },
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async assignParticipants(id: string, dto: AssignParticipantsDto, actorUserId: string) {
    await this.assertMeetingExists(id);
    await this.prisma.meetingParticipant.deleteMany({ where: { meetingId: id } });
    if (dto.participants.length > 0) {
      await this.prisma.meetingParticipant.createMany({
        data: dto.participants.map((p) => ({
          meetingId: id,
          userId: p.userId,
          canVote: p.canVote ?? true,
        })),
      });
    }
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.participants.updated',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return this.prisma.meeting.findUnique({
      where: { id },
      include: { participants: { include: { user: true } } },
    });
  }

  private async assertMeetingExists(id: string) {
    const m = await this.prisma.meeting.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Reunión no encontrada');
  }
}
