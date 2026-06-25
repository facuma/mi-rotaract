import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubMemberGuard } from './guards/club-member.guard';
import { MembershipCheckService } from './membership-check.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClubController],
  providers: [ClubService, ClubMemberGuard, MembershipCheckService],
  exports: [ClubService, ClubMemberGuard, MembershipCheckService],
})
export class ClubModule {}
