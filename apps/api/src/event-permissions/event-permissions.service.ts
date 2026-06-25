import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventPermissionScope, EventPermissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { QueryPermissionsDto } from './dto/query-permissions.dto';

@Injectable()
export class EventPermissionsService {
  private readonly logger = new Logger(EventPermissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventsBusService,
  ) {}

  async grant(dto: GrantPermissionDto, grantedById: string) {
    const club = await this.prisma.club.findUnique({ where: { id: dto.clubId } });
    if (!club) throw new NotFoundException('Club inexistente');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now())
      throw new BadRequestException('expiresAt debe ser una fecha futura');
    const existing = await this.prisma.eventDistrictPermission.findFirst({
      where: { clubId: dto.clubId, scope: dto.scope, status: EventPermissionStatus.ACTIVE },
    });
    if (existing) throw new ConflictException('Ya existe un permiso ACTIVE de ese scope para el club');
    const permission = await this.prisma.eventDistrictPermission.create({
      data: { clubId: dto.clubId, scope: dto.scope, grantedById, expiresAt, notes: dto.notes },
    });
    await this.audit.log({
      actorUserId: grantedById,
      clubId: dto.clubId,
      action: 'permission.granted',
      entityType: 'event_district_permission',
      entityId: permission.id,
      metadata: { scope: dto.scope, expiresAt: dto.expiresAt ?? null },
    });
    this.bus.emit(DomainEvents.PermissionGranted, { permissionId: permission.id, clubId: dto.clubId, scope: dto.scope });
    return permission;
  }

  async revoke(permissionId: string, revokedById: string) {
    const permission = await this.prisma.eventDistrictPermission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permiso inexistente');
    if (permission.status !== EventPermissionStatus.ACTIVE)
      throw new BadRequestException(`Solo se pueden revocar permisos ACTIVE (actual: ${permission.status})`);
    const updated = await this.prisma.eventDistrictPermission.update({
      where: { id: permissionId },
      data: { status: EventPermissionStatus.REVOKED, revokedById, revokedAt: new Date() },
    });
    await this.audit.log({
      actorUserId: revokedById,
      clubId: permission.clubId,
      action: 'permission.revoked',
      entityType: 'event_district_permission',
      entityId: permission.id,
      metadata: { scope: permission.scope },
    });
    this.bus.emit(DomainEvents.PermissionRevoked, { permissionId: permission.id, clubId: permission.clubId, scope: permission.scope });
    return updated;
  }

  async list(query: QueryPermissionsDto) {
    return this.prisma.eventDistrictPermission.findMany({
      where: {
        ...(query.clubId ? { clubId: query.clubId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.scope ? { scope: query.scope } : {}),
      },
      include: {
        club: { select: { id: true, name: true, code: true } },
        grantedBy: { select: { id: true, fullName: true, email: true } },
        revokedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { grantedAt: 'desc' }],
    });
  }

  async hasActivePermission(clubId: string, scope: EventPermissionScope): Promise<boolean> {
    const now = new Date();
    const found = await this.prisma.eventDistrictPermission.findFirst({
      where: { clubId, scope, status: EventPermissionStatus.ACTIVE, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true },
    });
    return !!found;
  }

  async expireDue() {
    const result = await this.prisma.eventDistrictPermission.updateMany({
      where: { status: EventPermissionStatus.ACTIVE, expiresAt: { lte: new Date() } },
      data: { status: EventPermissionStatus.EXPIRED },
    });
    if (result.count > 0) this.logger.log(`expired ${result.count} permission(s)`);
    return result.count;
  }
}
