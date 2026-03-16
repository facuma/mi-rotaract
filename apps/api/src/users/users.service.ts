import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { BulkImportResult } from '../common/bulk/bulk-result.types';
import { BulkCreateUserDto } from './dto/bulk-create-user.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { ClubMembersService } from '../club-members/club-members.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParser: CsvParserService,
    private readonly audit: AuditService,
    private readonly emailService: EmailService,
    private readonly clubMembersService: ClubMembersService,
  ) {}

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    role?: Role;
  }): Promise<User> {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    return this.prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email,
        passwordHash: data.passwordHash,
        role: data.role ?? Role.PARTICIPANT,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id, isActive: true },
    });
  }

  getBulkTemplate(): { buffer: Buffer; filename: string } {
    const header = ['fullName', 'email', 'role', 'sendInvite'];
    const example = ['María García', 'maria@club.org', 'PRESIDENT', 'true'];
    const buffer = this.csvParser.generateTemplateCsv(header, example);
    return { buffer, filename: 'plantilla-usuarios.csv' };
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
      const sendInvite = this.parseBool(row.sendInvite, true);

      const dto = plainToInstance(BulkCreateUserDto, {
        fullName: row.fullName?.trim() || '',
        email: row.email?.trim() || '',
        role: row.role?.trim() || 'PARTICIPANT',
        sendInvite,
        temporaryPassword: row.temporaryPassword?.trim() || undefined,
      });

      if (sendInvite === false && !(dto as BulkCreateUserDto).temporaryPassword) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: 'Cuando sendInvite=false se requiere temporaryPassword',
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

      const email = (dto as BulkCreateUserDto).email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existing) {
        result.errors.push({
          row: rowNum,
          data: row as Record<string, unknown>,
          message: `Ya existe un usuario con el email ${(dto as BulkCreateUserDto).email}`,
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
        let passwordHash: string;
        if (sendInvite) {
          passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        } else {
          passwordHash = await bcrypt.hash((dto as BulkCreateUserDto).temporaryPassword!, 10);
        }

        const user = await this.prisma.user.create({
          data: {
            fullName: (dto as BulkCreateUserDto).fullName.trim(),
            email,
            passwordHash,
            role: (dto as BulkCreateUserDto).role,
          },
        });

        if (sendInvite) {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = await bcrypt.hash(rawToken, 10);
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          await this.prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
          });
          await this.emailService.sendPasswordResetEmail(user.email, rawToken);
        }

        await this.clubMembersService.linkMembersToUser(user.id, user.email);

        result.created++;
        result.createdIds!.push(user.id);

        await this.audit.log({
          actorUserId,
          action: 'user.created',
          entityType: 'User',
          entityId: user.id,
          metadata: {
            fullName: user.fullName,
            email: user.email,
            sendInvite,
          },
        });
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
        entityType: 'User',
        metadata: {
          total: result.total,
          created: result.created,
          failed: result.failed,
        },
      });
    }

    if (result.errors.length > 0) {
      result.reportCsv = this.csvParser.generateReportCsv(
        ['fullName', 'email', 'role', 'sendInvite', 'temporaryPassword'],
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

  async findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async updateMe(
    userId: string,
    data: { fullName?: string; email?: string },
  ): Promise<{ id: string; fullName: string; email: string; role: Role }> {
    const updateData: { fullName?: string; email?: string } = {};
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName.trim();
    }
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
      updateData.email = email;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, fullName: true, email: true, role: true },
    });
    return user;
  }
}
