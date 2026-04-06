import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import * as path from 'path';
import { Readable } from 'stream';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  STORAGE_ADAPTER,
  STORAGE_ADAPTER_R2,
  STORAGE_ADAPTER_FS,
} from './storage/storage.module';
import { StorageAdapter } from './storage/storage.interface';
import { getEntityConfig } from './config/attachment-entity.config';

export type AttachmentEntityType =
  | 'report'
  | 'project'
  | 'event'
  | 'committee_activity'
  | 'meeting'
  | 'user_avatar';

export interface AttachmentUploadContext {
  clubId?: string;
  role?: Role;
  actorUserId?: string;
}

const storageBackendDefault = process.env.STORAGE_ADAPTER === 'fs' ? 'fs' : 'r2';

function getStorageForBackend(
  backend: string | null | undefined,
  r2: StorageAdapter,
  fs: StorageAdapter,
): StorageAdapter {
  return backend === 'fs' ? fs : r2;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    @Inject(STORAGE_ADAPTER_R2) private readonly r2Storage: StorageAdapter,
    @Inject(STORAGE_ADAPTER_FS) private readonly fsStorage: StorageAdapter,
  ) {}

  async list(entityType: string, entityId: string): Promise<Prisma.AttachmentGetPayload<object>[]> {
    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(
    entityType: AttachmentEntityType,
    entityId: string,
    file: Express.Multer.File,
    userId: string,
    context: AttachmentUploadContext,
  ) {
    if (!file || !file.originalname || !file.buffer) {
      throw new BadRequestException('Archivo requerido');
    }

    const config = getEntityConfig(entityType);
    if (!config) {
      throw new BadRequestException(`Tipo de entidad no soportado: ${entityType}`);
    }

    if (file.size > config.maxSizeBytes) {
      throw new BadRequestException(
        `Archivo demasiado grande (máx. ${Math.round(config.maxSizeBytes / 1024 / 1024)}MB)`,
      );
    }

    const mime = file.mimetype || '';
    if (!config.allowedMimes.includes(mime)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }

    await this.validateEntityAccess(entityType, entityId, userId, {
      ...context,
      actorUserId: userId,
    });

    // user_avatar: reemplazar anterior (solo 1 por usuario)
    if (entityType === 'user_avatar') {
      const existing = await this.prisma.attachment.findMany({
        where: { entityType, entityId },
      });
      for (const att of existing) {
        const storageBackend = att.storageBackend ?? storageBackendDefault;
        const adapter = getStorageForBackend(storageBackend, this.r2Storage, this.fsStorage);
        try {
          await adapter.delete(att.storageKey);
        } catch {
          /* idempotent */
        }
        await this.prisma.attachment.delete({ where: { id: att.id } });
      }
    }

    const count = await this.prisma.attachment.count({
      where: { entityType, entityId },
    });
    const entityLabels: Record<string, string> = {
      report: 'informe',
      project: 'proyecto',
      event: 'evento',
      committee_activity: 'actividad',
      meeting: 'reunión',
      user_avatar: 'avatar',
    };
    if (count >= config.maxFiles) {
      const label = entityLabels[entityType] ?? entityType;
      throw new BadRequestException(`Máximo ${config.maxFiles} archivos por ${label}`);
    }

    const ext = path.extname(file.originalname) || '.bin';
    const id = crypto.randomUUID();
    const storageKey = `rotaract/${entityType}/${entityId}/${id}${ext}`;
    const fileName = sanitizeFileName(file.originalname);

    await this.storage.upload({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });

    const attachment = await this.prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        storageBackend: storageBackendDefault,
        uploadedById: userId,
      },
    });

    const auditClubId = await this.getAuditClubId(entityType, entityId);
    await this.prisma.auditLog.create({
      data: {
        clubId: auditClubId ?? undefined,
        actorUserId: userId,
        action: 'attachment.uploaded',
        entityType: 'Attachment',
        entityId: attachment.id,
        metadataJson: JSON.stringify({ entityType, entityId }),
      },
    });

    return attachment;
  }

  async getAvatarStream(
    targetUserId: string,
    requesterId: string,
    role?: Role,
  ): Promise<{ stream: Readable; contentType: string }> {
    const attachment = await this.prisma.attachment.findFirst({
      where: { entityType: 'user_avatar', entityId: targetUserId },
      orderBy: { uploadedAt: 'desc' },
    });
    if (!attachment) throw new NotFoundException('Avatar no encontrado');

    await this.requireAttachmentAccess(
      'user_avatar',
      targetUserId,
      requesterId,
      role ?? Role.PARTICIPANT,
    );

    const storageBackend = attachment.storageBackend ?? storageBackendDefault;
    const adapter = getStorageForBackend(storageBackend, this.r2Storage, this.fsStorage);
    const stream = await adapter.getStream(attachment.storageKey);
    return {
      stream,
      contentType: attachment.mimeType || 'image/jpeg',
    };
  }

  async getForDownload(id: string, userId: string, role?: Role) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado');

    await this.requireAttachmentAccess(
      attachment.entityType as AttachmentEntityType,
      attachment.entityId,
      userId,
      role ?? Role.PARTICIPANT,
    );

    const storageBackend = 'storageBackend' in attachment ? attachment.storageBackend : undefined;
    const adapter = getStorageForBackend(storageBackend, this.r2Storage, this.fsStorage);
    const stream = await adapter.getStream(attachment.storageKey);
    const buffer = await streamToBuffer(stream);
    return { buffer, attachment };
  }

  async delete(
    id: string,
    context: AttachmentUploadContext & { actorUserId?: string },
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado');

    await this.validateEntityAccessForDelete(
      attachment.entityType as AttachmentEntityType,
      attachment.entityId,
      context,
    );

    const storageBackend = 'storageBackend' in attachment ? attachment.storageBackend : undefined;
    const adapter = getStorageForBackend(storageBackend, this.r2Storage, this.fsStorage);
    try {
      await adapter.delete(attachment.storageKey);
    } catch {
      // Idempotent: ignore if object missing
    }

    const auditClubId = await this.getAuditClubId(
      attachment.entityType as AttachmentEntityType,
      attachment.entityId,
    );
    await this.prisma.auditLog.create({
      data: {
        clubId: auditClubId ?? undefined,
        actorUserId: context.actorUserId ?? attachment.uploadedById,
        action: 'attachment.deleted',
        entityType: 'Attachment',
        entityId: attachment.id,
        metadataJson: JSON.stringify({
          entityType: attachment.entityType,
          entityId: attachment.entityId,
        }),
      },
    });

    await this.prisma.attachment.delete({ where: { id } });
    return { success: true };
  }

  private async validateEntityAccessForDelete(
    entityType: AttachmentEntityType,
    entityId: string,
    context: AttachmentUploadContext,
  ) {
    const config = getEntityConfig(entityType);
    if (!config) throw new ForbiddenException('Tipo de entidad no soportado');

    if (entityType === 'report') {
      const report = await this.prisma.report.findUnique({ where: { id: entityId } });
      if (!report || report.clubId !== context.clubId) {
        throw new ForbiddenException('Sin acceso a este informe');
      }
      if (!config.canDelete(report)) {
        throw new ForbiddenException(
          'Solo se pueden eliminar adjuntos de informes en borrador',
        );
      }
      return;
    }

    if (entityType === 'project') {
      const project = await this.prisma.project.findUnique({ where: { id: entityId } });
      if (!project || project.clubId !== context.clubId) {
        throw new ForbiddenException('Sin acceso a este proyecto');
      }
      if (!config.canDelete(project)) {
        throw new ForbiddenException('Sin permiso para eliminar este adjunto');
      }
      return;
    }

    if (entityType === 'event') {
      await this.requireEventUploadAccess(entityId, context.actorUserId ?? '', context);
      const event = await this.prisma.event.findUnique({ where: { id: entityId } });
      if (!event || !config.canDelete(event)) {
        throw new ForbiddenException('Solo se pueden eliminar adjuntos de eventos en borrador');
      }
      return;
    }

    if (entityType === 'committee_activity') {
      await this.requireCommitteeActivityAccess(entityId, context);
      return;
    }

    if (entityType === 'meeting') {
      await this.requireMeetingUploadAccess(entityId, context);
      const meeting = await this.prisma.meeting.findUnique({ where: { id: entityId } });
      if (!meeting || !config.canDelete(meeting)) {
        throw new ForbiddenException('Solo se pueden eliminar adjuntos de reuniones en borrador');
      }
      return;
    }
    if (entityType === 'user_avatar') {
      const actorId = context.actorUserId ?? '';
      if (actorId === entityId) return; // elimina propio avatar
      if (!context.clubId) throw new ForbiddenException('Solo puede eliminar fotos de miembros de su club');
      const member = await this.prisma.member.findFirst({
        where: { userId: entityId, clubId: context.clubId, deletedAt: null },
      });
      if (!member) throw new ForbiddenException('No puede editar la foto de usuarios de otros clubes');
      return;
    }

    throw new ForbiddenException('Tipo de entidad no soportado');
  }

  private async getAuditClubId(
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<string | null> {
    const clubId = await this.getEntityClubId(entityType, entityId);
    return clubId ?? null;
  }

  private async getEntityClubId(
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<string | null> {
    if (entityType === 'report') {
      const r = await this.prisma.report.findUnique({
        where: { id: entityId },
        select: { clubId: true },
      });
      return r?.clubId ?? null;
    }
    if (entityType === 'project') {
      const p = await this.prisma.project.findUnique({
        where: { id: entityId },
        select: { clubId: true },
      });
      return p?.clubId ?? null;
    }
    if (entityType === 'event') {
      const e = await this.prisma.event.findUnique({
        where: { id: entityId },
        select: { clubId: true },
      });
      return e?.clubId ?? null;
    }
    if (entityType === 'meeting') {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: entityId },
        select: { clubId: true },
      });
      return meeting?.clubId ?? null;
    }
    return null; // committee_activity: district-scoped
  }

  private async requireAttachmentAccess(
    entityType: AttachmentEntityType,
    entityId: string,
    userId: string,
    role: Role,
  ) {
    if (entityType === 'report' || entityType === 'project') {
      const clubId = await this.getEntityClubId(entityType, entityId);
      if (!clubId) throw new ForbiddenException('Adjunto no encontrado');
      await this.requireMembership(userId, clubId);
      return;
    }
    if (entityType === 'event') {
      const event = await this.prisma.event.findUnique({
        where: { id: entityId },
        select: { clubId: true, organizerId: true },
      });
      if (!event) throw new ForbiddenException('Adjunto no encontrado');
      if (role === Role.SECRETARY) return;
      if (event.organizerId === userId) return;
      if (event.clubId) {
        await this.requireMembership(userId, event.clubId);
        return;
      }
      throw new ForbiddenException('Sin acceso a este recurso');
    }
    if (entityType === 'committee_activity') {
      const activity = await this.prisma.committeeActivity.findUnique({
        where: { id: entityId },
        include: { committee: { select: { coordinatorId: true } } },
      });
      if (!activity) throw new ForbiddenException('Adjunto no encontrado');
      if (role === Role.SECRETARY) return;
      const isMember = await this.prisma.committeeMember.findFirst({
        where: { committeeId: activity.committeeId, userId },
      });
      if (activity.committee.coordinatorId === userId || isMember) return;
      throw new ForbiddenException('Sin acceso a este recurso');
    }
    if (entityType === 'meeting') {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: entityId },
        select: { clubId: true },
      });
      if (!meeting) throw new ForbiddenException('Adjunto no encontrado');
      if (role === Role.SECRETARY || role === Role.PRESIDENT) return;
      await this.requireMembership(userId, meeting.clubId);
      return;
    }
    if (entityType === 'user_avatar') {
      if (userId === entityId) return; // propio avatar
      await this.requireSameClub(userId, entityId);
      return;
    }
    throw new ForbiddenException('Tipo de entidad no soportado');
  }

  private async requireSameClub(viewerId: string, targetUserId: string) {
    const viewerClubs = await this.prisma.membership.findMany({
      where: {
        userId: viewerId,
        OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }],
      },
      select: { clubId: true },
    });
    const targetMember = await this.prisma.member.findFirst({
      where: {
        userId: targetUserId,
        clubId: { in: viewerClubs.map((m) => m.clubId) },
        deletedAt: null,
      },
    });
    if (!targetMember) throw new ForbiddenException('No puede editar la foto de usuarios de otros clubes');
  }

  private async requireMembership(userId: string, clubId: string) {
    const now = new Date();
    const m = await this.prisma.membership.findFirst({
      where: {
        userId,
        clubId,
        OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
      },
    });
    if (!m) throw new ForbiddenException('Sin acceso a este recurso');
  }

  private async validateEntityAccess(
    entityType: AttachmentEntityType,
    entityId: string,
    userId: string,
    context: AttachmentUploadContext,
  ) {
    if (entityType === 'report') {
      if (!context.clubId) throw new ForbiddenException('Contexto de club requerido');
      const report = await this.prisma.report.findUnique({ where: { id: entityId } });
      if (!report || report.clubId !== context.clubId) {
        throw new ForbiddenException('Sin acceso a este informe');
      }
      if (report.status !== 'DRAFT') {
        throw new ForbiddenException(
          'Solo se pueden agregar adjuntos a informes en borrador',
        );
      }
      return;
    }
    if (entityType === 'project') {
      if (!context.clubId) throw new ForbiddenException('Contexto de club requerido');
      const project = await this.prisma.project.findUnique({ where: { id: entityId } });
      if (!project || project.clubId !== context.clubId) {
        throw new ForbiddenException('Sin acceso a este proyecto');
      }
      return;
    }
    if (entityType === 'event') {
      await this.requireEventUploadAccess(entityId, userId, context);
      const event = await this.prisma.event.findUnique({ where: { id: entityId } });
      if (!event || event.status !== 'DRAFT') {
        throw new ForbiddenException('Solo se pueden agregar adjuntos a eventos en borrador');
      }
      return;
    }
    if (entityType === 'committee_activity') {
      await this.requireCommitteeActivityAccess(entityId, context);
      return;
    }
    if (entityType === 'meeting') {
      await this.requireMeetingUploadAccess(entityId, context);
      const meeting = await this.prisma.meeting.findUnique({ where: { id: entityId } });
      if (!meeting || meeting.status !== 'DRAFT') {
        throw new ForbiddenException('Solo se pueden agregar adjuntos a reuniones en borrador');
      }
      return;
    }
    if (entityType === 'user_avatar') {
      if (userId === entityId) return; // sube propio avatar
      if (!context.clubId) throw new ForbiddenException('Solo puede editar fotos de miembros de su club');
      const member = await this.prisma.member.findFirst({
        where: { userId: entityId, clubId: context.clubId, deletedAt: null },
      });
      if (!member) throw new ForbiddenException('No puede editar la foto de usuarios de otros clubes');
      return;
    }
    throw new ForbiddenException('Tipo de entidad no soportado');
  }

  private async requireEventUploadAccess(
    entityId: string,
    userId: string,
    context: AttachmentUploadContext,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: entityId },
      select: { clubId: true, organizerId: true },
    });
    if (!event) throw new ForbiddenException('Evento no encontrado');
    if (context.role === Role.SECRETARY) return;
    if (event.organizerId === userId) return;
    if (event.clubId && context.clubId && event.clubId === context.clubId) return;
    if (event.clubId && context.role === Role.PRESIDENT) {
      const presidentClubIds = await this.getPresidentClubIds(userId);
      if (presidentClubIds.includes(event.clubId)) return;
    }
    throw new ForbiddenException('Sin permiso para adjuntar a este evento');
  }

  private async getPresidentClubIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, isPresident: true },
      select: { clubId: true },
    });
    return memberships.map((m) => m.clubId);
  }

  private async requireCommitteeActivityAccess(
    entityId: string,
    context: AttachmentUploadContext,
  ) {
    if (context.role === Role.SECRETARY) return;
    const activity = await this.prisma.committeeActivity.findUnique({
      where: { id: entityId },
      include: { committee: { select: { coordinatorId: true } } },
    });
    if (!activity) throw new ForbiddenException('Actividad no encontrada');
    const actorId = context.actorUserId ?? '';
    if (activity.committee.coordinatorId === actorId) return;
    const isMember = await this.prisma.committeeMember.findFirst({
      where: { committeeId: activity.committeeId, userId: actorId },
    });
    if (isMember) return;
    throw new ForbiddenException(
      'Solo el equipo distrital, coordinador o miembros del comité pueden adjuntar',
    );
  }

  private async requireMeetingUploadAccess(
    entityId: string,
    context: AttachmentUploadContext,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: entityId },
      select: { clubId: true },
    });
    if (!meeting) throw new ForbiddenException('Reunión no encontrada');
    if (context.role === Role.SECRETARY) return;
    if (context.clubId && meeting.clubId === context.clubId) return;
    if (context.role === Role.PRESIDENT && context.actorUserId) {
      const presidentClubIds = await this.getPresidentClubIds(context.actorUserId);
      if (presidentClubIds.includes(meeting.clubId)) return;
    }
    throw new ForbiddenException('Sin permiso para adjuntar a esta reunión');
  }
}
