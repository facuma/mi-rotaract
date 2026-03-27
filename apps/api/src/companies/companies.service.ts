import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterCompanyDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.contactName,
        email: dto.contactEmail.toLowerCase(),
        passwordHash,
        role: Role.COMPANY,
      },
    });

    const company = await this.prisma.company.create({
      data: {
        ownerUserId: user.id,
        name: dto.name,
        country: dto.country ?? null,
        city: dto.city ?? null,
        industry: dto.industry ?? null,
        size: dto.size ?? null,
        website: dto.website ?? null,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail.toLowerCase(),
        phone: dto.phone ?? null,
      },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'company.registered',
      entityType: 'Company',
      entityId: company.id,
      metadata: { companyId: company.id },
    });

    return {
      company,
    };
  }

  async getMyCompany(userId: string, role: Role) {
    if (role !== Role.COMPANY) {
      throw new ForbiddenException('Solo empresas pueden acceder a esta sección');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerUserId: userId },
    });
    if (!company) {
      throw new UnauthorizedException('Empresa no encontrada para este usuario');
    }
    return company;
  }

  async updateMyCompany(userId: string, role: Role, dto: UpdateCompanyDto) {
    if (role !== Role.COMPANY) {
      throw new ForbiddenException('Solo empresas pueden actualizar sus datos');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerUserId: userId },
    });
    if (!company) {
      throw new UnauthorizedException('Empresa no encontrada para este usuario');
    }
    const updated = await this.prisma.company.update({
      where: { id: company.id },
      data: {
        country: dto.country ?? undefined,
        city: dto.city ?? undefined,
        industry: dto.industry ?? undefined,
        size: dto.size ?? undefined,
        website: dto.website ?? undefined,
        contactName: dto.contactName ?? undefined,
        contactEmail: dto.contactEmail?.toLowerCase() ?? undefined,
        phone: dto.phone ?? undefined,
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'company.updated',
      entityType: 'Company',
      entityId: company.id,
      metadata: { companyId: company.id },
    });

    return updated;
  }
}

