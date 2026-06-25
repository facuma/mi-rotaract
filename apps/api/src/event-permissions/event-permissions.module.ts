import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventPermissionsService } from './event-permissions.service';
import { EventPermissionsController } from './event-permissions.controller';
import { EventPermissionsScheduler } from './event-permissions.scheduler';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EventPermissionsController],
  providers: [EventPermissionsService, EventPermissionsScheduler],
  exports: [EventPermissionsService],
})
export class EventPermissionsModule {}
