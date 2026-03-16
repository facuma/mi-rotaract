import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubMemberGuard } from './guards/club-member.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ClubController],
  providers: [ClubService, ClubMemberGuard],
  exports: [ClubService, ClubMemberGuard],
})
export class ClubModule {}
