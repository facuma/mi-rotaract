import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MeetingStatus, MeetingType, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ClubsService } from '../clubs/clubs.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { QuorumService } from './quorum.service';
import { ActaService } from './acta.service';
import { AssignParticipantsDto } from './dto/assign-participants.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clubsService: ClubsService,
    private readonly realtime: RealtimeGateway,
    private readonly csvParser: CsvParserService,
    private readonly quorum: QuorumService,
    private readonly acta: ActaService,
  ) {}

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = ['title', 'description', 'clubId', 'scheduledAt'];
    const example = [
      'Reuni?n trimestral Q1',
      'Revisi?n de objetivos',
      'clxxx', // club id
      '2025-04-15 09:00',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-reuniones.csv' };
  }

  async getParticipantsBulkTemplate(meetingId: string): Promise<{ buffer: Buffer; filename: string }> {
    await this.assertMeetingExists(meetingId);
    const header = ['email', 'canVote'];
    const example = ['usuario@club.org', 'true'];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-participantes-reunion.csv' };
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val || val.trim() === '') return defaultVal;
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 's?' || v === 'si' || v === 'yes';
  }

  async bulkImport(
    file: Express.Multer.File | undefined,
    actorUserId: string,
    mode: 'partial' | 'strict' = 'partial',
  ): Promise<BulkImportResult> {
    if (!file?.buffer) {
      throw new BadRequestException('Archivo CSV requerido');
    }

    const rows = this.csvParser.parse(file.buffer);
    const result: BulkImportResult = {
      total: rows.length,
      created: 0,
      failed: 0,
      mode,
      createdIds: [],
      errors: [],
    };

    const headerCols = ['title', 'description', 'clubId', 'scheduledAt'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const dto = plainToInstance(CreateMeetingDto, {
        title: row.title?.trim() || '',
        description: row.description?.trim() || undefined,
        clubId: row.clubId?.trim() || '',
        scheduledAt: row.scheduledAt?.trim() || undefined,
      });

      const validationErrors = await validate(dto);
      if (validationErrors.length > 0) {
        const msg = validationErrors
          .map((e) => Object.values(e.constraints || {}).join(', '))
          .join('; ');
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: msg,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importaci?n abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        const club = await this.prisma.club.findFirst({
          where: {
            OR: [
              { id: (dto as CreateMeetingDto).clubId },
              { code: (dto as CreateMeetingDto).clubId.toUpperCase() },
            ],
          },
        });
        if (!club) {
          result.errors.push({
            row: rowNum,
            data: row as Record<string, unknown>,
            message: `Club no encontrado: ${(dto as CreateMeetingDto).clubId}`,
          });
          result.failed++;
          if (mode === 'strict') {
            for (let j = i + 1; j < rows.length; j++) {
              result.errors.push({
                row: j + 2,
                data: rows[j] as Record<string, unknown>,
                message: 'Importaci?n abortada: club no encontrado',
              });
              result.failed++;
            }
            return result;
          }
          continue;
        }

        const meeting = await this.prisma.meeting.create({
          data: {
            title: (dto as CreateMeetingDto).title.trim(),
            description: (dto as CreateMeetingDto).description?.trim() ?? null,
            scheduledAt: (dto as CreateMeetingDto).scheduledAt
              ? new Date((dto as CreateMeetingDto).scheduledAt!)
              : null,
            status: MeetingStatus.DRAFT,
            createdById: actorUserId,
            clubId: club.id,
          },
        });

        await this.audit.log({
          meetingId: meeting.id,
          actorUserId,
          action: 'meeting.created',
          entityType: 'Meeting',
          entityId: meeting.id,
        });

        result.created++;
        result.createdIds!.push(meeting.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: msg,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: `Importaci?n abortada: ${msg}`,
            });
            result.failed++;
          }
          return result;
        }
      }
    }

    if (result.created > 0) {
      await this.audit.log({
        actorUserId,
        action: 'BULK_IMPORT',
        entityType: 'Meeting',
        metadata: { total: result.total, created: result.created, failed: result.failed },
      });
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(headerCols, result.errors);
    }

    return result;
  }

  async bulkImportParticipants(
    meetingId: string,
    file: Express.Multer.File | undefined,
    actorUserId: string,
    mode: 'partial' | 'strict' = 'partial',
  ): Promise<BulkImportResult> {
    await this.assertMeetingExists(meetingId);
    if (!file?.buffer) {
      throw new BadRequestException('Archivo CSV requerido');
    }

    const rows = this.csvParser.parse(file.buffer);
    const result: BulkImportResult = {
      total: rows.length,
      created: 0,
      failed: 0,
      mode,
      createdIds: [],
      errors: [],
    };

    const headerCols = ['email', 'canVote'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const email = row.email?.trim()?.toLowerCase();
      if (!email) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: 'Email obligatorio',
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importaci?n abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      const user = await this.prisma.user.findUnique({
        where: { email, isActive: true },
      });
      if (!user) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: `Usuario no encontrado: ${row.email}`,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importaci?n abortada: usuario no encontrado',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        const canVote = this.parseBool(row.canVote, true);
        await this.prisma.meetingParticipant.upsert({
          where: {
            meetingId_userId: { meetingId, userId: user.id },
          },
          create: { meetingId, userId: user.id, canVote },
          update: { canVote },
        });
        result.created++;
        result.createdIds!.push(user.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: msg,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: `Importaci?n abortada: ${msg}`,
            });
            result.failed++;
          }
          return result;
        }
      }
    }

    if (result.created > 0) {
      await this.audit.log({
        meetingId,
        actorUserId,
        action: 'meeting.participants.bulk',
        entityType: 'MeetingParticipant',
        metadata: { total: result.total, created: result.created, failed: result.failed },
      });
      await this.realtime.broadcastSnapshot(meetingId);
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(headerCols, result.errors);
    }

    return result;
  }

  async create(dto: CreateMeetingDto, createdById: string) {
    const isDistrict = dto.isDistrictMeeting ?? true;
    const quorumRequired = isDistrict
      ? await this.quorum.calculateQuorumRequirement()
      : null;

    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: MeetingStatus.DRAFT,
        type: dto.type ?? MeetingType.ORDINARY,
        isDistrictMeeting: isDistrict,
        quorumRequired,
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
    const enabledClubs = await this.clubsService.findEnabledForDistrictMeetings();
    // Map each president to their club for per-club voting
    const participants: { userId: string; clubId: string }[] = [];
    const seenUserIds = new Set<string>();
    for (const club of enabledClubs) {
      for (const m of club.memberships) {
        if (!seenUserIds.has(m.userId)) {
          seenUserIds.add(m.userId);
          participants.push({ userId: m.userId, clubId: club.id });
        }
      }
    }
    if (participants.length > 0) {
      await this.prisma.meetingParticipant.createMany({
        data: participants.map((p) => ({
          meetingId: meeting.id,
          userId: p.userId,
          clubId: p.clubId,
          canVote: true,
        })),
      });
    }
    return meeting;
  }

  async findAll(userId: string, role: Role) {
    if (role === Role.SECRETARY || role === Role.PRESIDENT || role === Role.RDR) {
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
    if (!meeting) throw new NotFoundException('Reuni?n no encontrada');
    if (role !== Role.SECRETARY && role !== Role.PRESIDENT && role !== Role.RDR) {
      const isParticipant = meeting.participants.some((p) => p.userId === userId);
      if (!isParticipant && meeting.status !== MeetingStatus.DRAFT)
        throw new NotFoundException('No ten?s acceso a esta reuni?n');
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

    // Art. 41-42: Check quorum on start for district meetings
    let quorumMet = true;
    let isInformationalOnly = false;
    if (meeting.isDistrictMeeting) {
      const quorumStatus = await this.quorum.checkQuorum(id);
      quorumMet = quorumStatus.met;
      isInformationalOnly = !quorumMet; // Art. 42: no quorum = informational only
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.LIVE,
        startedAt: new Date(),
        quorumMet,
        isInformationalOnly,
      },
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
    if (!meeting) throw new NotFoundException('Reuni?n no encontrada');
    if (meeting.status !== MeetingStatus.LIVE)
      throw new BadRequestException('Solo se puede pausar una reuni?n en vivo');
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
    if (!meeting) throw new NotFoundException('Reuni?n no encontrada');
    if (meeting.status !== MeetingStatus.PAUSED)
      throw new BadRequestException('Solo se puede reanudar una reuni?n pausada');
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
    if (!meeting) throw new NotFoundException('Reuni?n no encontrada');
    if (meeting.status !== MeetingStatus.LIVE && meeting.status !== MeetingStatus.PAUSED)
      throw new BadRequestException('Solo se puede finalizar una reuni?n en vivo o pausada');
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

    // Auto-generate acta draft (Art. 27a)
    try {
      await this.acta.generateDraft(id);
    } catch {
      // Non-blocking: if acta generation fails, meeting is still finished
    }

    return updated;
  }

  async lockAttendance(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');
    if (meeting.attendanceLocked) throw new BadRequestException('La asistencia ya está cerrada');
    const updated = await this.prisma.meeting.update({
      where: { id },
      data: { attendanceLocked: true, attendanceLockedAt: new Date() },
      include: { club: true },
    });
    await this.audit.log({
      meetingId: id,
      actorUserId,
      action: 'meeting.attendance.locked',
      entityType: 'Meeting',
      entityId: id,
    });
    await this.realtime.broadcastSnapshot(id);
    return updated;
  }

  async schedule(id: string, actorUserId: string) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Reuni?n no encontrada');
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
    if (!m) throw new NotFoundException('Reuni?n no encontrada');
  }
}
