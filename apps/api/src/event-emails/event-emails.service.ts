import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailStatus, EmailTemplateType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { DEFAULT_TEMPLATES } from './default-templates';
import { renderTemplate } from './template-renderer';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class EventEmailsService {
  private readonly logger = new Logger(EventEmailsService.name);
  private readonly appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: EmailService,
  ) {}

  async ensureDefaultTemplates(eventId: string) {
    const existing = await this.prisma.eventEmailTemplate.findMany({
      where: { eventId },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((t) => t.type));
    const toCreate = DEFAULT_TEMPLATES.filter((t) => !existingTypes.has(t.type));
    if (toCreate.length === 0) return;
    await this.prisma.eventEmailTemplate.createMany({
      data: toCreate.map((t) => ({
        eventId,
        type: t.type,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
      })),
    });
    this.logger.log(`seeded ${toCreate.length} templates for event ${eventId}`);
  }

  async listTemplates(eventId: string) {
    return this.prisma.eventEmailTemplate.findMany({ where: { eventId }, orderBy: { type: 'asc' } });
  }

  async upsertTemplate(eventId: string, type: EmailTemplateType, dto: UpdateTemplateDto) {
    return this.prisma.eventEmailTemplate.upsert({
      where: { eventId_type: { eventId, type } },
      create: { eventId, type, subject: dto.subject, bodyHtml: dto.bodyHtml, bodyText: dto.bodyText },
      update: { subject: dto.subject, bodyHtml: dto.bodyHtml, bodyText: dto.bodyText },
    });
  }

  async listLogs(eventId: string, limit = 200) {
    return this.prisma.eventEmailLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async sendForRegistration(
    type: EmailTemplateType,
    event: { id: string; title: string; startsAt: Date; location?: string | null },
    registration: { id: string; email: string; fullName: string },
    extraVars: Record<string, string | undefined> = {},
    attachments?: any[],
  ) {
    const template = await this.resolveTemplate(event.id, type);
    if (!template) {
      this.logger.warn(`no template ${type} for event ${event.id}, skipping`);
      return;
    }
    const vars: Record<string, string> = {
      eventTitle: event.title,
      startsAt: event.startsAt.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' } as any),
      location: event.location ?? '',
      fullName: registration.fullName,
      checkInUrl: `${this.appBaseUrl}/eventos/${event.id}/mi-inscripcion?reg=${registration.id}`,
      appBaseUrl: this.appBaseUrl,
      ...Object.fromEntries(Object.entries(extraVars).filter(([, v]) => v !== undefined)) as Record<string, string>,
    };
    const log = await this.prisma.eventEmailLog.create({
      data: {
        eventId: event.id,
        registrationId: registration.id,
        toEmail: registration.email,
        templateType: type,
        status: EmailStatus.QUEUED,
      },
    });
    try {
      await this.mailer.send({
        to: registration.email,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.bodyHtml, vars),
        text: template.bodyText ? renderTemplate(template.bodyText, vars) : undefined,
        attachments,
        metadata: { logId: log.id, eventId: event.id, type },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.eventEmailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.FAILED, error: message },
      });
      this.logger.error(`enqueue failed for log=${log.id}: ${message}`);
    }
  }

  async resolveTemplate(eventId: string, type: EmailTemplateType) {
    const found = await this.prisma.eventEmailTemplate.findUnique({
      where: { eventId_type: { eventId, type } },
    });
    if (found) return found;
    return DEFAULT_TEMPLATES.find((t) => t.type === type) ?? null;
  }

  async assertEventExists(eventId: string) {
    const e = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!e) throw new NotFoundException('Evento no encontrado');
  }
}
