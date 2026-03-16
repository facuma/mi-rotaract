import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ClubReportsController } from './club-reports.controller';
import { ClubReportsService } from './club-reports.service';
import { ClubModule } from '../club/club.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ClubModule,
    AttachmentsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ClubReportsController],
  providers: [ClubReportsService],
})
export class ClubReportsModule {}
