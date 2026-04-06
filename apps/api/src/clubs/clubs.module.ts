import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubStatusService } from './club-status.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ClubsController],
  providers: [ClubsService, ClubStatusService],
  exports: [ClubsService, ClubStatusService],
})
export class ClubsModule {}
