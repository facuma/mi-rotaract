import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { BulkModule } from '../common/bulk/bulk.module';
import { EventEmailsModule } from '../event-emails/event-emails.module';
import { EventCheckInModule } from '../event-check-in/event-check-in.module';
import { EventRegistrationFormsModule } from '../event-registration-forms/event-registration-forms.module';
import { ClubModule } from '../club/club.module';
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistrationsController } from './event-registrations.controller';
import { MyRegistrationsController } from './my-registrations.controller';
import { EventRegistrationsHandlers } from './event-registrations.handlers';
import { EventRegistrationsBulkImporterFactory } from './event-registrations.bulk-importer';
import { CsvRegistrationExporter } from './exporters/csv-exporter';
import { XlsxRegistrationExporter } from './exporters/xlsx-exporter';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BulkModule,
    EventEmailsModule,
    EventCheckInModule,
    EventRegistrationFormsModule,
    ClubModule,
  ],
  controllers: [EventRegistrationsController, MyRegistrationsController],
  providers: [
    EventRegistrationsService,
    EventRegistrationsHandlers,
    EventRegistrationsBulkImporterFactory,
    CsvRegistrationExporter,
    XlsxRegistrationExporter,
  ],
  exports: [EventRegistrationsService],
})
export class EventRegistrationsModule {}
