import { Module } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { CommitteesController } from './committees/committees.controller';
import { CommitteesService } from './committees/committees.service';
import { DistrictClubsController } from './clubs/district-clubs.controller';
import { DistrictClubsService } from './clubs/district-clubs.service';
import { PeriodsController } from './periods/periods.controller';
import { PeriodsService } from './periods/periods.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';

@Module({
  imports: [ClubsModule, AttachmentsModule],
  controllers: [
    PeriodsController,
    ReportsController,
    DistrictClubsController,
    CommitteesController,
  ],
  providers: [
    PeriodsService,
    ReportsService,
    DistrictClubsService,
    CommitteesService,
  ],
  exports: [PeriodsService, ReportsService],
})
export class DistrictModule {}
