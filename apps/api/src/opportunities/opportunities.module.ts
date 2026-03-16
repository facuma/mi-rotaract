import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PublishOpportunityGuard } from './guards/publish-opportunity.guard';
import { OwnerOrDistritalGuard } from './guards/owner-or-distrital.guard';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, PublishOpportunityGuard, OwnerOrDistritalGuard],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
