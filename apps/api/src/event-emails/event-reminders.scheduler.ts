import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailTemplateType, EventStatus, RegistrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmailsService } from './event-emails.service';

@Injectable()
export class EventRemindersScheduler {
  private readonly logger = new Logger(EventRemindersScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EventEmailsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'event-reminders' })
  async process() {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        remindersAt: { isEmpty: false },
      },
    });
    for (const event of events) {
      const sent = new Set(event.sentReminders.map((d) => d.getTime()));
      const due = event.remindersAt.filter(
        (d) => d.getTime() <= now.getTime() && !sent.has(d.getTime()),
      );
      if (due.length === 0) continue;
      const recipients = await this.prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: RegistrationStatus.CONFIRMED },
        select: { id: true, email: true, fullName: true },
      });
      this.logger.log(
        `event ${event.id}: ${due.length} reminder(s) due, ${recipients.length} recipient(s)`,
      );
      for (const reg of recipients) {
        await this.emails.sendForRegistration(EmailTemplateType.REMINDER, event, reg);
      }
      await this.prisma.event.update({
        where: { id: event.id },
        data: { sentReminders: { push: due } },
      });
    }
  }
}
