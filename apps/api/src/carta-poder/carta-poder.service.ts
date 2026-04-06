import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCartaPoderDto } from './dto/create-carta-poder.dto';

@Injectable()
export class CartaPoderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Art. 46: Create a carta poder for a club's delegate at a meeting.
   * Digital cartas must be received min 7 days before the meeting.
   */
  async create(meetingId: string, dto: CreateCartaPoderDto, presidentUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, scheduledAt: true, status: true },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.status === 'FINISHED' || meeting.status === 'ARCHIVED') {
      throw new BadRequestException('No se puede crear carta poder para una reunión finalizada');
    }

    // Art. 46: 7 days before meeting for digital cartas
    if (meeting.scheduledAt) {
      const sevenDaysBefore = new Date(meeting.scheduledAt);
      sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
      if (new Date() > sevenDaysBefore && meeting.status !== 'DRAFT') {
        throw new BadRequestException(
          'Las cartas poder digitales deben recibirse con mínimo 7 días de anticipación (Art. 46)',
        );
      }
    }

    // One carta poder per club per meeting
    const existing = await this.prisma.cartaPoder.findUnique({
      where: { meetingId_clubId: { meetingId, clubId: dto.clubId } },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una carta poder para este club en esta reunión');
    }

    const cartaPoder = await this.prisma.cartaPoder.create({
      data: {
        meetingId,
        clubId: dto.clubId,
        presidentUserId,
        delegateUserId: dto.delegateUserId,
        documentUrl: dto.documentUrl ?? null,
      },
    });

    await this.audit.log({
      meetingId,
      actorUserId: presidentUserId,
      action: 'carta_poder.created',
      entityType: 'CartaPoder',
      entityId: cartaPoder.id,
    });

    return cartaPoder;
  }

  async verify(meetingId: string, cartaPoderId: string, verifiedById: string) {
    const cp = await this.prisma.cartaPoder.findFirst({
      where: { id: cartaPoderId, meetingId },
    });
    if (!cp) throw new NotFoundException('Carta poder no encontrada');

    const updated = await this.prisma.cartaPoder.update({
      where: { id: cartaPoderId },
      data: { verified: true, verifiedById },
    });

    // Auto-add delegate as meeting participant with canVote and isDelegate
    await this.prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId, userId: cp.delegateUserId } },
      create: {
        meetingId,
        userId: cp.delegateUserId,
        clubId: cp.clubId,
        canVote: true,
        isDelegate: true,
      },
      update: {
        clubId: cp.clubId,
        canVote: true,
        isDelegate: true,
      },
    });

    await this.audit.log({
      meetingId,
      actorUserId: verifiedById,
      action: 'carta_poder.verified',
      entityType: 'CartaPoder',
      entityId: cartaPoderId,
    });

    return updated;
  }

  async findByMeeting(meetingId: string) {
    return this.prisma.cartaPoder.findMany({
      where: { meetingId },
      include: {
        club: { select: { id: true, name: true } },
      },
    });
  }

  async remove(meetingId: string, cartaPoderId: string, actorUserId: string) {
    const cp = await this.prisma.cartaPoder.findFirst({
      where: { id: cartaPoderId, meetingId },
    });
    if (!cp) throw new NotFoundException('Carta poder no encontrada');

    await this.prisma.cartaPoder.delete({ where: { id: cartaPoderId } });

    await this.audit.log({
      meetingId,
      actorUserId,
      action: 'carta_poder.deleted',
      entityType: 'CartaPoder',
      entityId: cartaPoderId,
    });
  }
}
