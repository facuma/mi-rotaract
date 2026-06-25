import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventRegistrationFormsService } from './event-registration-forms.service';
import { EventRegistrationFormsController } from './event-registration-forms.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EventRegistrationFormsController],
  providers: [EventRegistrationFormsService],
  exports: [EventRegistrationFormsService],
})
export class EventRegistrationFormsModule {}
