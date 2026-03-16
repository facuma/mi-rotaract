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
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SpeakingQueueModule } from './speaking-queue/speaking-queue.module';
import { TalentModule } from './talent/talent.module';
import { TimersModule } from './timers/timers.module';
import { TopicsModule } from './topics/topics.module';
import { VotingModule } from './voting/voting.module';

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
    ClubsModule, ClubModule, ClubReportsModule, DashboardModule, AttachmentsModule, ClubProjectsModule, ClubMembersModule, DistrictModule, EventsModule, HistoryModule, MeetingsModule, OpportunitiesModule, ProfileModule, RealtimeModule, SpeakingQueueModule, TalentModule, TimersModule, TopicsModule, VotingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
