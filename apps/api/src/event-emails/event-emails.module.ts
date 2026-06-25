import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmailsService } from './event-emails.service';
import { EventEmailsController } from './event-emails.controller';
import { EventRemindersScheduler } from './event-reminders.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [EventEmailsController],
  providers: [EventEmailsService, EventRemindersScheduler],
  exports: [EventEmailsService],
})
export class EventEmailsModule {}
