import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { MemberStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class ClubMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly attachments: AttachmentsService,
    private readonly csvParser: CsvParserService,
  ) {}

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'birthDate',
      'joinedAt',
      'status',
      'title',
      'internalNotes',
    ];
    const example = [
      'María',
      'García',
      'maria@club.org',
      '+34 600 111 222',
      '1995-03-15',
      '2024-01-01',
      'ACTIVE',
      'Socio',
      '',
    ];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-socios.csv' };
  }

  async bulkImport(
    clubId: string,
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

      const dto = plainToInstance(CreateMemberDto, {
        firstName: row.firstName?.trim() || '',
        lastName: row.lastName?.trim() || '',
        email: row.email?.trim() || '',
        phone: row.phone?.trim() || undefined,
        birthDate: row.birthDate?.trim() || undefined,
        joinedAt: row.joinedAt?.trim() || undefined,
        status: row.status?.trim() || undefined,
        title: row.title?.trim() || undefined,
        internalNotes: row.internalNotes?.trim() || undefined,
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

      const email = normalizeEmail((dto as CreateMemberDto).email);
      const existing = await this.prisma.member.findFirst({
        where: { clubId, email, deletedAt: null },
      });
      if (existing) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: `Ya existe un socio con el email ${(dto as CreateMemberDto).email} en este club`,
        });
        result.failed++;
        if (mode === 'strict') {
          for (let j = i + 1; j < rows.length; j++) {
            result.errors.push({
              row: j + 2,
              data: rows[j] as Record<string, unknown>,
              message: 'Importación abortada: email duplicado',
            });
            result.failed++;
          }
          return result;
        }
        continue;
      }

      try {
        const member = await this.prisma.member.create({
          data: {
            clubId,
            firstName: (dto as CreateMemberDto).firstName.trim(),
            lastName: (dto as CreateMemberDto).lastName.trim(),
            email,
            phone: (dto as CreateMemberDto).phone?.trim() || null,
            birthDate: (dto as CreateMemberDto).birthDate
              ? new Date((dto as CreateMemberDto).birthDate!)
              : null,
            joinedAt: (dto as CreateMemberDto).joinedAt
              ? new Date((dto as CreateMemberDto).joinedAt!)
              : null,
            status: ((dto as CreateMemberDto).status as MemberStatus) ?? MemberStatus.PENDIENTE,
            title: (dto as CreateMemberDto).title?.trim() || null,
            internalNotes: (dto as CreateMemberDto).internalNotes?.trim() || null,
          },
        });
        await this.linkUserToMemberIfApplicable(
          member.id,
          clubId,
          email,
          member.title,
          member.isPresident,
        );
        result.created++;
        result.createdIds!.push(member.id);

        await this.audit.log({
          clubId,
          actorUserId,
          action: 'member.created',
          entityType: 'Member',
          entityId: member.id,
          metadata: {
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push({ row: rowNum, data: row as Record<string, unknown>, message: msg });
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
        clubId,
        actorUserId,
        action: 'BULK_IMPORT',
        entityType: 'Member',
        metadata: { total: result.total, created: result.created, failed: result.failed },
      });
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(
        ['firstName', 'lastName', 'email', 'phone', 'birthDate', 'joinedAt', 'status', 'title', 'internalNotes'],
        result.errors,
      );
    }

    return result;
  }

  async findAll(clubId: string, dto: QueryMembersDto) {
    const { status, title, search, includeDeleted, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = { clubId };
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    if (status) where.status = status;
    if (title) where.title = title;
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.member.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, clubId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, clubId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!member) throw new NotFoundException('Socio no encontrado');
    return member;
  }

  async create(clubId: string, dto: CreateMemberDto, actorUserId: string) {
    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.member.findFirst({
      where: {
        clubId,
        email,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un socio con el email ${dto.email} en este club`,
      );
    }

    const member = await this.prisma.member.create({
      data: {
        clubId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : null,
        status: dto.status ?? MemberStatus.PENDIENTE,
        title: dto.title?.trim() || null,
        internalNotes: dto.internalNotes?.trim() || null,
      },
    });

    await this.linkUserToMemberIfApplicable(member.id, clubId, email, member.title, member.isPresident);

    await this.audit.log({
      clubId,
      actorUserId,
      action: 'member.created',
      entityType: 'Member',
      entityId: member.id,
      metadata: {
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
      },
    });

    return this.findOne(member.id, clubId);
  }

  async update(
    id: string,
    clubId: string,
    dto: UpdateMemberDto,
    actorUserId: string,
  ) {
    const member = await this.findOne(id, clubId);
    if (member.deletedAt) {
      throw new BadRequestException('No se puede editar un socio dado de baja');
    }

    const email =
      dto.email !== undefined ? normalizeEmail(dto.email) : member.email;
    if (dto.email !== undefined && email !== member.email) {
      const existing = await this.prisma.member.findFirst({
        where: {
          clubId,
          email,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un socio con el email ${dto.email} en este club`,
        );
      }
    }

    const fields: string[] = [];
    const data: Prisma.MemberUpdateInput = {};
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim();
      fields.push('firstName');
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim();
      fields.push('lastName');
    }
    if (dto.email !== undefined) {
      data.email = email;
      fields.push('email');
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
      fields.push('phone');
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
      fields.push('birthDate');
    }
    if (dto.joinedAt !== undefined) {
      data.joinedAt = dto.joinedAt ? new Date(dto.joinedAt) : null;
      fields.push('joinedAt');
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      fields.push('status');
    }
    if (dto.title !== undefined) {
      data.title = dto.title?.trim() || null;
      fields.push('title');
    }
    if (dto.internalNotes !== undefined) {
      data.internalNotes = dto.internalNotes?.trim() || null;
      fields.push('internalNotes');
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data,
    });

    if (fields.length > 0) {
      await this.audit.log({
        clubId,
        actorUserId,
        action: 'member.updated',
        entityType: 'Member',
        entityId: id,
        metadata: { fields },
      });
    }

    return updated;
  }

  async changeStatus(
    id: string,
    clubId: string,
    status: MemberStatus,
    actorUserId: string,
  ) {
    const member = await this.findOne(id, clubId);
    if (member.deletedAt) {
      throw new BadRequestException('No se puede cambiar estado de un socio dado de baja');
    }

    const previous = member.status;
    await this.prisma.member.update({
      where: { id },
      data: { status },
    });

    await this.audit.log({
      clubId,
      actorUserId,
      action: 'member.status.changed',
      entityType: 'Member',
      entityId: id,
      metadata: { from: previous, to: status },
    });

    return this.findOne(id, clubId);
  }

  async assignPresident(id: string, clubId: string, actorUserId: string) {
    const member = await this.findOne(id, clubId);
    if (member.deletedAt) {
      throw new BadRequestException('No se puede asignar presidente a un socio dado de baja');
    }
    if (member.isPresident) {
      return member;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.member.updateMany({
        where: { clubId, isPresident: true },
        data: { isPresident: false },
      });
      await tx.member.update({
        where: { id },
        data: { isPresident: true, title: 'Presidente' },
      });
    });

    await this.audit.log({
      clubId,
      actorUserId,
      action: 'member.president.assigned',
      entityType: 'Member',
      entityId: id,
      metadata: { memberId: id },
    });

    return this.findOne(id, clubId);
  }

  async softDelete(id: string, clubId: string, actorUserId: string) {
    const member = await this.findOne(id, clubId);
    if (member.deletedAt) {
      throw new BadRequestException('El socio ya está dado de baja');
    }

    const now = new Date();
    const freedEmail = `__deleted_${id}_${now.getTime()}@deleted.local`;

    await this.prisma.member.update({
      where: { id },
      data: { deletedAt: now, email: freedEmail },
    });

    await this.audit.log({
      clubId,
      actorUserId,
      action: 'member.deactivated',
      entityType: 'Member',
      entityId: id,
      metadata: { previousEmail: member.email },
    });

    return { success: true };
  }

  async getHistory(id: string, clubId: string) {
    await this.findOne(id, clubId);
    return this.audit.findByEntity('Member', id);
  }

  async getIncompleteProfiles(clubId: string) {
    return this.prisma.member.findMany({
      where: {
        clubId,
        deletedAt: null,
        OR: [
          { phone: null },
          { joinedAt: null },
          { birthDate: null },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        joinedAt: true,
        birthDate: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  /**
   * Si existe un User con ese email que no tiene ninguna Membership, vincular
   * el Member al User y crear la Membership. Llamar tras crear un Member.
   */
  async linkUserToMemberIfApplicable(
    memberId: string,
    clubId: string,
    email: string,
    memberTitle: string | null,
    memberIsPresident: boolean,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email), isActive: true },
      include: { memberships: true },
    });
    if (!user || user.memberships.length > 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: { userId: user.id },
      });
      await tx.membership.upsert({
        where: {
          userId_clubId: { userId: user.id, clubId },
        },
        update: {},
        create: {
          userId: user.id,
          clubId,
          title: memberTitle,
          isPresident: memberIsPresident,
        },
      });
    });
  }

  /**
   * Vincular Members existentes al User cuando se registra (por email).
   * Crear Membership para cada club vinculado.
   * Llamar desde Auth/Register tras crear el User.
   */
  async linkMembersToUser(userId: string, userEmail: string): Promise<number> {
    const email = normalizeEmail(userEmail);
    const [members, user] = await Promise.all([
      this.prisma.member.findMany({
        where: {
          email,
          userId: null,
          deletedAt: null,
        },
        include: { club: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      }),
    ]);

    if (!user) {
      return 0;
    }

    let linked = 0;
    for (const m of members) {
      await this.prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: m.id },
          data: { userId },
        });
        await tx.membership.upsert({
          where: {
            userId_clubId: { userId, clubId: m.clubId },
          },
          update: {},
          create: {
            userId,
            clubId: m.clubId,
            title: m.title,
            isPresident: m.isPresident,
          },
        });
      });
      linked++;
    }

    // Si no había socios precargados con ese email, usar presidentEmail en Club
    // para crear automáticamente el socio y la Membership de presidente.
    if (linked === 0) {
      const clubs = await this.prisma.club.findMany({
        where: { presidentEmail: email },
      });

      for (const club of clubs) {
        await this.prisma.$transaction(async (tx) => {
          // Reusar Member existente si ya hay uno con ese email en el club
          let member = await tx.member.findFirst({
            where: {
              clubId: club.id,
              email,
              deletedAt: null,
            },
          });

          if (!member) {
            const trimmed = user.fullName.trim();
            const spaceIdx = trimmed.indexOf(' ');
            const firstName = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx) : trimmed;
            const lastName = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1).trim() : firstName;

            member = await tx.member.create({
              data: {
                clubId: club.id,
                userId,
                firstName: firstName || trimmed,
                lastName: lastName || trimmed || firstName,
                email,
                status: MemberStatus.ACTIVE,
                title: 'Presidente',
                isPresident: true,
                joinedAt: new Date(),
              },
            });
          } else if (!member.userId) {
            member = await tx.member.update({
              where: { id: member.id },
              data: {
                userId,
                isPresident: true,
                title: member.title || 'Presidente',
              },
            });
          }

          await tx.membership.upsert({
            where: {
              userId_clubId: { userId, clubId: club.id },
            },
            update: {
              isPresident: true,
              title: member.title || 'Presidente',
            },
            create: {
              userId,
              clubId: club.id,
              title: member.title || 'Presidente',
              isPresident: true,
            },
          });
        });
        linked++;
      }
    }

    return linked;
  }

  /**
   * Sincronizar fullName y email de los Members vinculados cuando el User actualiza sus datos.
   * fullName se divide en firstName (primer palabra) y lastName (resto).
   * Llamar tras actualizar User.fullName o User.email.
   */
  async syncMemberDataFromUser(
    userId: string,
    fullName: string,
    email: string,
  ): Promise<void> {
    const trimmed = fullName.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const firstName = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx) : trimmed;
    const lastName = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1).trim() : firstName;

    await this.prisma.member.updateMany({
      where: { userId, deletedAt: null },
      data: {
        firstName: firstName || trimmed,
        lastName: lastName || trimmed || firstName,
        email: normalizeEmail(email),
      },
    });
  }

  async uploadMemberAvatar(
    memberId: string,
    clubId: string,
    file: Express.Multer.File,
    actorUserId: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Socio no encontrado');
    if (!member.userId) {
      throw new BadRequestException('El socio no tiene cuenta vinculada');
    }
    await this.attachments.upload(
      'user_avatar',
      member.userId,
      file,
      actorUserId,
      { clubId, actorUserId },
    );
    const photoUrl = `/profile/avatar/${member.userId}`;
    await this.prisma.userProfile.upsert({
      where: { userId: member.userId },
      create: { userId: member.userId, photoUrl },
      update: { photoUrl },
    });
    await this.audit.log({
      actorUserId,
      action: 'club.member.avatar.uploaded',
      entityType: 'Member',
      entityId: member.id,
      clubId,
      metadata: { memberId, targetUserId: member.userId },
    });
    return { photoUrl };
  }
}
