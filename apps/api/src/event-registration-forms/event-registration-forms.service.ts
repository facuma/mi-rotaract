import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertFormSchema, validateFormData } from './schema-types';

@Injectable()
export class EventRegistrationFormsService {
  private readonly logger = new Logger(EventRegistrationFormsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(eventId: string) {
    return this.prisma.eventRegistrationForm.findUnique({ where: { eventId } });
  }

  async getPublic(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { status: true } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.status !== EventStatus.PUBLISHED) return null;
    return this.get(eventId);
  }

  async upsert(eventId: string, rawSchema: unknown, actorUserId: string) {
    let validated: ReturnType<typeof assertFormSchema>;
    try {
      validated = assertFormSchema(rawSchema);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Schema inválido');
    }
    const existing = await this.prisma.eventRegistrationForm.findUnique({ where: { eventId } });
    const form = existing
      ? await this.prisma.eventRegistrationForm.update({
          where: { eventId },
          data: { schema: validated as any, version: existing.version + 1 },
        })
      : await this.prisma.eventRegistrationForm.create({
          data: { eventId, schema: validated as any, version: 1 },
        });
    await this.audit.log({
      actorUserId,
      action: 'event_registration_form.upserted',
      entityType: 'event',
      entityId: eventId,
      metadata: { version: form.version, sections: validated.sections.length },
    });
    return form;
  }

  async validateSubmission(eventId: string, values: Record<string, unknown>) {
    const form = await this.get(eventId);
    if (!form) return { errors: [], formVersion: null };
    const schema = assertFormSchema(form.schema);
    return { errors: validateFormData(schema, values), formVersion: form.version };
  }
}
