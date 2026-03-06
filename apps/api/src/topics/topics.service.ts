import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MeetingStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReorderTopicsDto } from './dto/reorder-topics.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
  ) {}

  async findAll(meetingId: string) {
    return this.prisma.agendaTopic.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });
  }

  async create(meetingId: string, dto: CreateTopicDto) {
    await this.assertMeetingExists(meetingId);
    const maxOrder = await this.prisma.agendaTopic
      .aggregate({ where: { meetingId }, _max: { order: true } })
      .then((r) => r._max.order ?? -1);
    return this.prisma.agendaTopic.create({
      data: {
        meetingId,
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order ?? maxOrder + 1,
        type: dto.type ?? 'DISCUSSION',
        estimatedDurationSec: dto.estimatedDurationSec ?? null,
      },
    });
  }

  async update(meetingId: string, topicId: string, dto: UpdateTopicDto) {
    await this.assertTopicInMeeting(meetingId, topicId);
    return this.prisma.agendaTopic.update({
      where: { id: topicId },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.order != null && { order: dto.order }),
        ...(dto.type != null && { type: dto.type }),
        ...(dto.estimatedDurationSec !== undefined && { estimatedDurationSec: dto.estimatedDurationSec }),
        ...(dto.status != null && { status: dto.status }),
      },
    });
  }

  async remove(meetingId: string, topicId: string) {
    await this.assertTopicInMeeting(meetingId, topicId);
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (meeting?.currentTopicId === topicId) {
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: { currentTopicId: null },
      });
    }
    await this.prisma.agendaTopic.delete({ where: { id: topicId } });
    return { ok: true };
  }

  async reorder(meetingId: string, dto: ReorderTopicsDto) {
    await this.assertMeetingExists(meetingId);
    const topics = await this.prisma.agendaTopic.findMany({
      where: { meetingId, id: { in: dto.topicIds } },
    });
    if (topics.length !== dto.topicIds.length)
      throw new BadRequestException('Algunos temas no pertenecen a esta reunión');
    await this.prisma.$transaction(
      dto.topicIds.map((id, index) =>
        this.prisma.agendaTopic.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
    return this.findAll(meetingId);
  }

  async setCurrentTopic(meetingId: string, topicId: string | null, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status !== MeetingStatus.LIVE && meeting.status !== MeetingStatus.PAUSED)
      throw new BadRequestException('Solo se puede cambiar el tema actual en reunión en vivo o pausada');
    if (topicId) {
      await this.assertTopicInMeeting(meetingId, topicId);
    }
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { currentTopicId: topicId },
      include: { club: true },
    });
    await this.audit.log({
      meetingId,
      actorUserId,
      action: 'meeting.topic.changed',
      entityType: 'AgendaTopic',
      entityId: topicId ?? undefined,
    });
    await this.realtime.broadcastSnapshot(meetingId);
    return updated;
  }

  private async assertMeetingExists(meetingId: string) {
    const m = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!m) throw new NotFoundException('Reunión no encontrada');
  }

  private async assertTopicInMeeting(meetingId: string, topicId: string) {
    const t = await this.prisma.agendaTopic.findFirst({
      where: { id: topicId, meetingId },
    });
    if (!t) throw new NotFoundException('Tema no encontrado');
  }
}
