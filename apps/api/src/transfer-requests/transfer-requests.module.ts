import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClubModule } from '../club/club.module';
import { TransferRequestsService } from './transfer-requests.service';
import { TransferRequestsController } from './transfer-requests.controller';

@Module({
  imports: [PrismaModule, AuditModule, ClubModule],
  controllers: [TransferRequestsController],
  providers: [TransferRequestsService],
  exports: [TransferRequestsService],
})
export class TransferRequestsModule {}
