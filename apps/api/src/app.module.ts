import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { HistoryModule } from './history/history.module';
import { MeetingsModule } from './meetings/meetings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SpeakingQueueModule } from './speaking-queue/speaking-queue.module';
import { TimersModule } from './timers/timers.module';
import { TopicsModule } from './topics/topics.module';
import { VotingModule } from './voting/voting.module';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, ClubsModule, MeetingsModule, TopicsModule, RealtimeModule, VotingModule, SpeakingQueueModule, TimersModule, HistoryModule],
  controllers: [AppController],
})
export class AppModule {}
