import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClubModule } from '../club/club.module';
import { ClubBoardService } from './club-board.service';
import { ClubBoardController } from './club-board.controller';

@Module({
  imports: [PrismaModule, AuditModule, ClubModule],
  controllers: [ClubBoardController],
  providers: [ClubBoardService],
  exports: [ClubBoardService],
})
export class ClubBoardModule {}
