import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const eventInclude = {
  club: { select: { id: true, name: true, code: true } },
  organizer: { select: { id: true, fullName: true, email: true } },
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
  ) {}

  private async getPresidentClubIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, isPresident: true },
      select: { clubId: true },
    });
    return memberships.map((m) => m.clubId);
  }

  private async canAccessEvent(
    event: { clubId: string | null },
    userId: string,
    role: Role,
  ): Promise<boolean> {
    if (role === Role.SECRETARY) return true;
    if (role === Role.PARTICIPANT) return false; // DRAFT only - PARTICIPANT never sees DRAFT
    if (role === Role.PRESIDENT) {
      if (!event.clubId) return false; // PRESIDENT cannot access draft distrital events
      const clubIds = await this.getPresidentClubIds(userId);
      return clubIds.includes(event.clubId);
    }
    return false;
  }

  private async buildWhereForList(
    dto: QueryEventsDto,
    userId: string,
    role: Role,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const where: Record<string, unknown> = {};

    // PARTICIPANT: only PUBLISHED, CANCELLED, FINISHED
    if (role === Role.PARTICIPANT) {
      where.status = { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.FINISHED] };
    }

    if (dto.status) where.status = dto.status;
    if (dto.type) where.type = dto.type;
    if (dto.modality) where.modality = dto.modality;
    if (dto.clubId) where.clubId = dto.clubId;
    if (dto.organizerId) where.organizerId = dto.organizerId;
    if (dto.featured === true) where.featured = true;

    if (dto.upcoming) {
      where.startsAt = { gte: now };
    } else if (dto.past) {
      where.startsAt = { lt: now };
    }

    if (dto.from || dto.to) {
      where.startsAt = where.startsAt || {};
      if (dto.from) {
        (where.startsAt as Record<string, Date>).gte = new Date(dto.from);
      }
      if (dto.to) {
        (where.startsAt as Record<string, Date>).lte = new Date(dto.to);
      }
    }

    // PRESIDENT: always restrict to their clubs (admin sees only events they can manage)
    if (role === Role.PRESIDENT) {
      const clubIds = await this.getPresidentClubIds(userId);
      if (clubIds.length === 0) {
        where.clubId = '__no_club__'; // impossible - returns empty
      } else {
        const filterClubId = dto.clubId && clubIds.includes(dto.clubId) ? dto.clubId : undefined;
        where.clubId = filterClubId ?? { in: clubIds };
      }
    }

    return where;
  }

  async findAll(dto: QueryEventsDto, userId: string, role: Role) {
    const where = await this.buildWhereForList(dto, userId, role);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { startsAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: eventInclude,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findUpcoming(limit = 5) {
    const now = new Date();
    return this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startsAt: { gte: now },
      },
      orderBy: [{ featured: 'desc' }, { startsAt: 'asc' }],
      take: limit,
      include: eventInclude,
    });
  }

  async findPast(page = 1, limit = 20) {
    const now = new Date();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          status: { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.FINISHED] },
          startsAt: { lt: now },
        },
        orderBy: { startsAt: 'desc' },
        skip,
        take: limit,
        include: eventInclude,
      }),
      this.prisma.event.count({
        where: {
          status: { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.FINISHED] },
          startsAt: { lt: now },
        },
      }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string, role: Role) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (event.status === EventStatus.DRAFT) {
      const canAccess = await this.canAccessEvent(event, userId, role);
      if (!canAccess) {
        throw new NotFoundException('Evento no encontrado');
      }
    }

    return event;
  }

  private async assertCanManageEvent(
    eventId: string,
    userId: string,
    role: Role,
  ): Promise<{ event: Awaited<ReturnType<typeof this.prisma.event.findUnique>> }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: eventInclude,
    });
    if (!event) throw new NotFoundException('Evento no encontrado');

    if (role === Role.SECRETARY) return { event };
    if (role === Role.PRESIDENT) {
      if (!event.clubId) {
        throw new ForbiddenException('Solo el equipo distrital puede gestionar eventos distritales');
      }
      const clubIds = await this.getPresidentClubIds(userId);
      if (!clubIds.includes(event.clubId)) {
        throw new ForbiddenException('No podés gestionar eventos de otros clubes');
      }
      return { event };
    }
    throw new ForbiddenException('No tenés permiso para gestionar este evento');
  }

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = [
      'title',
      'description',
      'type',
      'modality',
      'startsAt',
      'endsAt',
      'location',
      'meetingUrl',
      'maxCapacity',
      'featured',
      'clubId',
    ];
    const example = [
      'Encuentro distrital',
      'Reunión trimestral',
      'DISTRITAL',
      'PRESENCIAL',
      '2025-04-15 09:00',
      '',
      'Hotel XYZ',
      '',
      '200',
      'true',
      '',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-eventos.csv' };
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val || val.trim() === '') return defaultVal;
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'sí' || v === 'si' || v === 'yes';
  }

  async bulkImport(
    file: Express.Multer.File | undefined,
    userId: string,
    role: Role,
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      let clubId: string | null = row.clubId?.trim() || null;

      if (role === Role.PRESIDENT && !clubId) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: 'Los presidentes deben asociar un club al evento',
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importación abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      if (clubId && role === Role.PRESIDENT) {
        const clubIds = await this.getPresidentClubIds(userId);
        const club = await this.prisma.club.findFirst({
          where: {
            OR: [{ id: clubId }, { code: clubId.toUpperCase() }],
          },
        });
        if (club && !clubIds.includes(club.id)) {
          result.errors.push({
            row: rowNum,
            data: row as Record<string, unknown>,
            message: 'Solo podés asignar tu club al evento',
          });
          result.failed++;
          if (mode === 'strict') {
            for (let j = i + 1; j < rows.length; j++) {
              result.errors.push({
                row: j + 2,
                data: rows[j] as Record<string, unknown>,
                message: 'Importación abortada (modo estricto)',
              });
              result.failed++;
            }
            return result;
          }
          continue;
        }
      }

      const dto = plainToInstance(CreateEventDto, {
        title: row.title?.trim() || '',
        description: row.description?.trim() || undefined,
        type: row.type?.trim() || 'DISTRITAL',
        modality: row.modality?.trim() || 'PRESENCIAL',
        startsAt: row.startsAt?.trim() || new Date().toISOString(),
        endsAt: row.endsAt?.trim() || undefined,
        location: row.location?.trim() || undefined,
        meetingUrl: row.meetingUrl?.trim() || undefined,
        maxCapacity: row.maxCapacity ? parseInt(row.maxCapacity, 10) : undefined,
        featured: this.parseBool(row.featured, false),
        clubId: clubId || undefined,
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
              message: 'Importación abortada (modo estricto)',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        if (clubId) {
          const club = await this.prisma.club.findFirst({
            where: {
              OR: [{ id: clubId }, { code: clubId.toUpperCase() }],
            },
          });
          if (club) clubId = club.id;
        }

        const event = await this.prisma.event.create({
          data: {
            title: (dto as CreateEventDto).title.trim(),
            description: (dto as CreateEventDto).description?.trim() || null,
            type: (dto as CreateEventDto).type,
            modality: (dto as CreateEventDto).modality,
            startsAt: new Date((dto as CreateEventDto).startsAt),
            endsAt: (dto as CreateEventDto).endsAt
              ? new Date((dto as CreateEventDto).endsAt!)
              : null,
            location: (dto as CreateEventDto).location?.trim() || null,
            meetingUrl: (dto as CreateEventDto).meetingUrl?.trim() || null,
            maxCapacity: (dto as CreateEventDto).maxCapacity ?? null,
            featured: (dto as CreateEventDto).featured ?? false,
            clubId,
            organizerId: userId,
            status: EventStatus.DRAFT,
          },
        });
        result.created++;
        result.createdIds!.push(event.id);
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
              message: `Importación abortada: ${msg}`,
            });
            result.failed++;
          }
          return result;
        }
      }
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(
        [
          'title',
          'description',
          'type',
          'modality',
          'startsAt',
          'endsAt',
          'location',
          'meetingUrl',
          'maxCapacity',
          'featured',
          'clubId',
        ],
        result.errors,
      );
    }

    return result;
  }

  async create(dto: CreateEventDto, userId: string, role: Role) {
    if (role === Role.PARTICIPANT) {
      throw new ForbiddenException('No tenés permiso para crear eventos');
    }

    if (role === Role.PRESIDENT && dto.clubId) {
      const clubIds = await this.getPresidentClubIds(userId);
      if (!clubIds.includes(dto.clubId)) {
        throw new ForbiddenException('Solo podés crear eventos para tu club');
      }
    }

    if (role === Role.PRESIDENT && !dto.clubId) {
      throw new ForbiddenException('Los presidentes deben asociar un club al evento');
    }

    const data: Parameters<typeof this.prisma.event.create>[0]['data'] = {
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      type: dto.type,
      modality: dto.modality,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      location: dto.location?.trim() || null,
      meetingUrl: dto.meetingUrl?.trim() || null,
      maxCapacity: dto.maxCapacity ?? null,
      featured: dto.featured ?? false,
      imageUrl: dto.imageUrl?.trim() || null,
      clubId: dto.clubId || null,
      organizerId: userId,
      status: EventStatus.DRAFT,
    };

    return this.prisma.event.create({
      data,
      include: eventInclude,
    });
  }

  async update(id: string, dto: UpdateEventDto, userId: string, role: Role) {
    await this.assertCanManageEvent(id, userId, role);

    if (dto.clubId !== undefined && role === Role.PRESIDENT) {
      const clubIds = await this.getPresidentClubIds(userId);
      if (!clubIds.includes(dto.clubId)) {
        throw new ForbiddenException('Solo podés asignar tu club al evento');
      }
    }

    const data: Parameters<typeof this.prisma.event.update>[0]['data'] = {};
    if (dto.title != null) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.type != null) data.type = dto.type;
    if (dto.modality != null) data.modality = dto.modality;
    if (dto.startsAt != null) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.location !== undefined) data.location = dto.location?.trim() || null;
    if (dto.meetingUrl !== undefined) data.meetingUrl = dto.meetingUrl?.trim() || null;
    if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity ?? null;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.clubId !== undefined) data.clubId = dto.clubId || null;
    if (dto.status != null) data.status = dto.status;

    return this.prisma.event.update({
      where: { id },
      data,
      include: eventInclude,
    });
  }

  async remove(id: string, userId: string, role: Role) {
    await this.assertCanManageEvent(id, userId, role);
    return this.prisma.event.delete({
      where: { id },
      include: eventInclude,
    });
  }

  async publish(id: string, userId: string, role: Role) {
    const { event } = await this.assertCanManageEvent(id, userId, role);
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Solo se puede publicar un evento en borrador');
    }
    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED },
      include: eventInclude,
    });
  }

  async cancel(id: string, userId: string, role: Role) {
    const { event } = await this.assertCanManageEvent(id, userId, role);
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Solo se puede cancelar un evento publicado');
    }
    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
      include: eventInclude,
    });
  }

  async markFinished(id: string, userId: string, role: Role) {
    const { event } = await this.assertCanManageEvent(id, userId, role);
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Solo se puede marcar como finalizado un evento publicado');
    }
    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.FINISHED },
      include: eventInclude,
    });
  }
}
