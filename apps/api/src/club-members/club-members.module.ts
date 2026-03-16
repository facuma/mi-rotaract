import { Module } from '@nestjs/common';
import { ClubMembersController } from './club-members.controller';
import { ClubMembersService } from './club-members.service';
import { ClubModule } from '../club/club.module';
import { AuditModule } from '../audit/audit.module';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [ClubModule, AuditModule, AttachmentsModule],
  controllers: [ClubMembersController],
  providers: [ClubMembersService],
  exports: [ClubMembersService],
})
export class ClubMembersModule {}
