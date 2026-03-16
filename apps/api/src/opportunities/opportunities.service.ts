import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import type { OpportunityStatus, Prisma } from '@prisma/client';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly csvParser: CsvParserService,
  ) {}

  async findAll(query: QueryOpportunitiesDto) {
    const { page = 1, limit = 20, activeOnly, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OpportunityWhereInput = {};

    if (filters.type) where.type = filters.type;
    if (filters.modality) where.modality = filters.modality;
    if (filters.organization)
      where.organization = { contains: filters.organization, mode: 'insensitive' };
    if (filters.area)
      where.area = { contains: filters.area, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;

    if (activeOnly) {
      where.status = 'PUBLISHED';
      where.OR = [
        { deadlineAt: null },
        { deadlineAt: { gte: new Date() } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        orderBy: [{ status: 'asc' }, { deadlineAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, fullName: true },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
      },
    });
    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }
    return opportunity;
  }

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = [
      'title',
      'description',
      'requirements',
      'type',
      'modality',
      'area',
      'organization',
      'externalUrl',
      'deadlineAt',
      'featured',
    ];
    const example = [
      'Convocatoria beca',
      'Beca de estudios',
      'Estudiantes universitarios',
      'BECA',
      'PRESENCIAL',
      'Educación',
      'Fundación XYZ',
      'https://ejemplo.org',
      '2025-06-30',
      'false',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-oportunidades.csv' };
  }

  private parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val || val.trim() === '') return defaultVal;
    const v = val.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'sí' || v === 'si' || v === 'yes';
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

    const headerCols = [
      'title',
      'description',
      'requirements',
      'type',
      'modality',
      'area',
      'organization',
      'externalUrl',
      'deadlineAt',
      'featured',
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const dto = plainToInstance(CreateOpportunityDto, {
        title: row.title?.trim() || '',
        description: row.description?.trim() || undefined,
        requirements: row.requirements?.trim() || undefined,
        type: row.type?.trim() || 'EMPLEO',
        modality: row.modality?.trim() || 'PRESENCIAL',
        area: row.area?.trim() || undefined,
        organization: row.organization?.trim() || undefined,
        externalUrl: row.externalUrl?.trim() || undefined,
        deadlineAt: row.deadlineAt?.trim() || undefined,
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
        const opportunity = await this.prisma.opportunity.create({
          data: {
            title: (dto as CreateOpportunityDto).title,
            description: (dto as CreateOpportunityDto).description,
            requirements: (dto as CreateOpportunityDto).requirements,
            type: (dto as CreateOpportunityDto).type,
            modality: (dto as CreateOpportunityDto).modality,
            area: (dto as CreateOpportunityDto).area,
            organization: (dto as CreateOpportunityDto).organization,
            externalUrl: (dto as CreateOpportunityDto).externalUrl,
            deadlineAt: (dto as CreateOpportunityDto).deadlineAt
              ? new Date((dto as CreateOpportunityDto).deadlineAt!)
              : null,
            featured: this.parseBool(row.featured, false),
            status: 'DRAFT',
            createdById: actorUserId,
          },
        });

        await this.audit.log({
          actorUserId,
          action: 'opportunity.created',
          entityType: 'Opportunity',
          entityId: opportunity.id,
          metadata: { title: opportunity.title },
        });

        result.created++;
        result.createdIds!.push(opportunity.id);
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

    if (result.created > 0) {
      await this.audit.log({
        actorUserId,
        action: 'BULK_IMPORT',
        entityType: 'Opportunity',
        metadata: { total: result.total, created: result.created, failed: result.failed },
      });
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(headerCols, result.errors);
    }

    return result;
  }

  async create(dto: CreateOpportunityDto, userId: string) {
    const opportunity = await this.prisma.opportunity.create({
      data: {
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        type: dto.type,
        modality: dto.modality,
        area: dto.area,
        organization: dto.organization,
        externalUrl: dto.externalUrl,
        deadlineAt: dto.deadlineAt ? new Date(dto.deadlineAt) : null,
        status: 'DRAFT',
        createdById: userId,
      },
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'opportunity.created',
      entityType: 'Opportunity',
      entityId: opportunity.id,
      metadata: { title: opportunity.title },
    });

    return opportunity;
  }

  async update(id: string, dto: UpdateOpportunityDto, userId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    const data: Prisma.OpportunityUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.requirements !== undefined) data.requirements = dto.requirements;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.modality !== undefined) data.modality = dto.modality;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.organization !== undefined) data.organization = dto.organization;
    if (dto.externalUrl !== undefined) data.externalUrl = dto.externalUrl;
    if (dto.deadlineAt !== undefined)
      data.deadlineAt = dto.deadlineAt ? new Date(dto.deadlineAt) : null;

    const opportunity = await this.prisma.opportunity.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'opportunity.updated',
      entityType: 'Opportunity',
      entityId: id,
      metadata: { title: opportunity.title },
    });

    return opportunity;
  }

  async publish(id: string, userId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Oportunidad no encontrada');
    }
    if (existing.status !== 'DRAFT') {
      throw new NotFoundException(
        'Solo oportunidades en borrador pueden publicarse',
      );
    }

    const opportunity = await this.prisma.opportunity.update({
      where: { id },
      data: {
        status: 'PUBLISHED' as OpportunityStatus,
        publishedAt: new Date(),
      },
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'opportunity.published',
      entityType: 'Opportunity',
      entityId: id,
      metadata: { title: opportunity.title },
    });

    return opportunity;
  }

  async archive(id: string, userId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    const opportunity = await this.prisma.opportunity.update({
      where: { id },
      data: { status: 'ARCHIVED' as OpportunityStatus },
      include: {
        creator: {
          select: { id: true, fullName: true },
        },
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'opportunity.archived',
      entityType: 'Opportunity',
      entityId: id,
      metadata: { title: opportunity.title },
    });

    return opportunity;
  }
}
