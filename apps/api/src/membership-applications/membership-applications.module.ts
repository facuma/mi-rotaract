import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClubModule } from '../club/club.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipApplicationsService } from './membership-applications.service';
import { ApplicationsMailer } from './applications.mailer';
import {
  MyMembershipApplicationsController,
  PrivateMembershipApplicationsController,
} from './membership-applications.controller';

@Module({
  imports: [PrismaModule, AuditModule, ClubModule, EmailModule, NotificationsModule],
  controllers: [MyMembershipApplicationsController, PrivateMembershipApplicationsController],
  providers: [MembershipApplicationsService, ApplicationsMailer],
  exports: [MembershipApplicationsService],
})
export class MembershipApplicationsModule {}
