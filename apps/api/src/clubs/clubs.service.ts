import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly csvParser: CsvParserService,
  ) {}

  async findAll(includeInactive = false) {
    return this.prisma.club.findMany({
      where: includeInactive ? undefined : { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const club = await this.prisma.club.findUnique({
      where: { id },
    });
    if (!club) throw new NotFoundException('Club no encontrado');
    return club;
  }

  async create(dto: CreateClubDto) {
    const existing = await this.prisma.club.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un club con el código ${dto.code}`);
    }
    return this.prisma.club.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        presidentEmail: dto.presidentEmail?.trim().toLowerCase() || null,
        enabledForDistrictMeetings: dto.enabledForDistrictMeetings ?? true,
        cuotaAldia: dto.cuotaAldia ?? false,
        informeAlDia: dto.informeAlDia ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateClubDto) {
    await this.findOne(id);
    if (dto.code != null) {
      const existing = await this.prisma.club.findFirst({
        where: { code: dto.code.trim().toUpperCase(), NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un club con el código ${dto.code}`);
      }
    }
    return this.prisma.club.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name.trim() }),
        ...(dto.code != null && { code: dto.code.trim().toUpperCase() }),
        ...(dto.presidentEmail !== undefined && {
          presidentEmail: dto.presidentEmail?.trim().toLowerCase() || null,
        }),
        ...(dto.enabledForDistrictMeetings !== undefined && {
          enabledForDistrictMeetings: dto.enabledForDistrictMeetings,
        }),
        ...(dto.cuotaAldia !== undefined && { cuotaAldia: dto.cuotaAldia }),
        ...(dto.informeAlDia !== undefined && { informeAlDia: dto.informeAlDia }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Baja lógica: se desactiva el club y se evita que participe en nuevas reuniones,
    // pero se conserva el historial de reuniones, eventos, informes y proyectos.
    return this.prisma.club.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        enabledForDistrictMeetings: false,
      },
    });
  }

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = [
      'name',
      'code',
      'presidentEmail',
      'enabledForDistrictMeetings',
      'cuotaAldia',
      'informeAlDia',
    ];
    const example = [
      'Club Rotaract Alpha',
      'CLUB-ALPHA',
      'presi@alpha.org',
      'true',
      'false',
      'false',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-clubes.csv' };
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const dto = plainToInstance(CreateClubDto, {
        name: row.name?.trim() || '',
        code: row.code?.trim() || '',
        presidentEmail: row.presidentEmail?.trim() || undefined,
        enabledForDistrictMeetings: this.parseBool(row.enabledForDistrictMeetings, true),
        cuotaAldia: this.parseBool(row.cuotaAldia, false),
        informeAlDia: this.parseBool(row.informeAlDia, false),
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        const msg = errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ');
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: msg,
        });
        result.failed++;
        if (mode === 'strict') {
          result.errors.push(
            ...rows.slice(i + 1).map((r, idx) => ({
              row: i + idx + 3,
              data: r as Record<string, unknown>,
              message: 'Importación abortada (modo estricto)',
            })),
          );
          result.failed += rows.length - i - 1;
          return result;
        }
        continue;
      }

      try {
        const existing = await this.prisma.club.findUnique({
          where: { code: (dto as CreateClubDto).code.trim().toUpperCase() },
        });
        if (existing) {
          result.errors.push({
            row: rowNum,
            data: row as Record<string, unknown>,
            message: `Ya existe un club con el código ${(dto as CreateClubDto).code}`,
          });
          result.failed++;
          if (mode === 'strict') {
            return this.abortStrict(result, rows, i + 1, 'Código duplicado');
          }
          continue;
        }

        const club = await this.prisma.club.create({
          data: {
            name: (dto as CreateClubDto).name.trim(),
            code: (dto as CreateClubDto).code.trim().toUpperCase(),
            presidentEmail: (dto as CreateClubDto).presidentEmail?.trim().toLowerCase() || null,
            enabledForDistrictMeetings: (dto as CreateClubDto).enabledForDistrictMeetings ?? true,
            cuotaAldia: (dto as CreateClubDto).cuotaAldia ?? false,
            informeAlDia: (dto as CreateClubDto).informeAlDia ?? false,
          },
        });
        result.created++;
        result.createdIds!.push(club.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push({ row: rowNum, data: row as Record<string, unknown>, message: msg });
        result.failed++;
        if (mode === 'strict') {
          return this.abortStrict(result, rows, i + 1, msg);
        }
      }
    }

    if (result.created > 0) {
      await this.audit.log({
        actorUserId,
        action: 'BULK_IMPORT',
        entityType: 'Club',
        metadata: {
          total: result.total,
          created: result.created,
          failed: result.failed,
        },
      });
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(
        ['name', 'code', 'presidentEmail', 'enabledForDistrictMeetings', 'cuotaAldia', 'informeAlDia'],
        result.errors,
      );
    }

    return result;
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val || val.trim() === '') return defaultVal;
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'sí' || v === 'si' || v === 'yes';
  }

  private abortStrict(
    result: BulkImportResult,
    rows: Record<string, string>[],
    fromIdx: number,
    reason: string,
  ): BulkImportResult {
    for (let j = fromIdx; j < rows.length; j++) {
      result.errors.push({
        row: j + 2,
        data: rows[j] as Record<string, unknown>,
        message: `Importación abortada: ${reason}`,
      });
      result.failed++;
    }
    return result;
  }

  async findEnabledForDistrictMeetings() {
    return this.prisma.club.findMany({
      where: { status: 'ACTIVE', enabledForDistrictMeetings: true },
      include: {
        memberships: {
          where: { isPresident: true },
          select: { userId: true },
        },
      },
    });
  }
}
