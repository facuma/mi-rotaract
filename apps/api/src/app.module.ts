import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BulkModule } from './common/bulk/bulk.module';
import { EmailModule } from './email/email.module';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClubModule } from './club/club.module';
import { ClubReportsModule } from './club-reports/club-reports.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ClubProjectsModule } from './club-projects/club-projects.module';
import { ClubMembersModule } from './club-members/club-members.module';
import { DistrictModule } from './district/district.module';
import { EventsModule } from './events/events.module';
import { HistoryModule } from './history/history.module';
import { MeetingsModule } from './meetings/meetings.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { CompaniesModule } from './companies/companies.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SpeakingQueueModule } from './speaking-queue/speaking-queue.module';
import { TalentModule } from './talent/talent.module';
import { TimersModule } from './timers/timers.module';
import { TopicsModule } from './topics/topics.module';
import { VotingModule } from './voting/voting.module';
import { CartaPoderModule } from './carta-poder/carta-poder.module';
import { EventsBusModule } from './events-bus/events-bus.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventPermissionsModule } from './event-permissions/event-permissions.module';
import { EventEmailsModule } from './event-emails/event-emails.module';
import { EventCheckInModule } from './event-check-in/event-check-in.module';
import { EventRegistrationsModule } from './event-registrations/event-registrations.module';
import { EventPaymentsModule } from './event-payments/event-payments.module';
import { EventMealsModule } from './event-meals/event-meals.module';
import { EventRegistrationFormsModule } from './event-registration-forms/event-registration-forms.module';
import { EventPublicModule } from './event-public/event-public.module';
import { ClubPresidencyModule } from './club-presidency/club-presidency.module';
import { MeModule } from './me/me.module';
import { ClubBoardModule } from './club-board/club-board.module';
import { MembershipApplicationsModule } from './membership-applications/membership-applications.module';
import { TransferRequestsModule } from './transfer-requests/transfer-requests.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
    BulkModule,
    EmailModule,
    PrismaModule,
    AuthModule,
    AuditModule,
    EventsBusModule,
    QueueModule,
    NotificationsModule,
    ClubsModule, ClubModule, ClubReportsModule, DashboardModule, AttachmentsModule, ClubProjectsModule, ClubMembersModule, DistrictModule, EventsModule, HistoryModule, MeetingsModule, OpportunitiesModule, ProfileModule, RealtimeModule, SpeakingQueueModule, TalentModule, TimersModule, TopicsModule, VotingModule, CompaniesModule, CartaPoderModule,
    EventPermissionsModule,
    EventEmailsModule,
    EventCheckInModule,
    EventRegistrationsModule,
    EventPaymentsModule,
    EventMealsModule,
    EventRegistrationFormsModule,
    EventPublicModule,
    ClubPresidencyModule,
    MeModule,
    ClubBoardModule,
    MembershipApplicationsModule,
    TransferRequestsModule,
    PlatformAdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
