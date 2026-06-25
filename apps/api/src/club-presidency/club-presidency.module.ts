import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClubModule } from '../club/club.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClubPresidencyService } from './club-presidency.service';
import { ClubPresidencyController } from './club-presidency.controller';
import { ClubPresidencyScheduler } from './club-presidency.scheduler';
import { PresidencyMailer } from './presidency.mailer';

@Module({
  imports: [PrismaModule, AuditModule, ClubModule, EmailModule, NotificationsModule],
  controllers: [ClubPresidencyController],
  providers: [ClubPresidencyService, ClubPresidencyScheduler, PresidencyMailer],
  exports: [ClubPresidencyService],
})
export class ClubPresidencyModule {}
