import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { ClubsModule } from '../clubs/clubs.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { QuorumService } from './quorum.service';
import { ActaService } from './acta.service';
import { ActaController } from './acta.controller';

@Module({
  imports: [AuditModule, AttachmentsModule, ClubsModule, RealtimeModule],
  controllers: [MeetingsController, ActaController],
  providers: [MeetingsService, QuorumService, ActaService],
  exports: [MeetingsService, QuorumService, ActaService],
})
export class MeetingsModule {}
