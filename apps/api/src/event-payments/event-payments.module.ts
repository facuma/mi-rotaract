import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventEmailsModule } from '../event-emails/event-emails.module';
import { EventCheckInModule } from '../event-check-in/event-check-in.module';
import { EventPaymentsService } from './event-payments.service';
import { EventPaymentsController } from './event-payments.controller';
import { EventPaymentsHandlers } from './event-payments.handlers';
import { EventPaymentsScheduler } from './event-payments.scheduler';
import { ManualPaymentGateway } from './gateway/manual-payment.gateway';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';

@Module({
  imports: [PrismaModule, AuditModule, EventEmailsModule, EventCheckInModule],
  controllers: [EventPaymentsController],
  providers: [
    EventPaymentsService,
    EventPaymentsHandlers,
    EventPaymentsScheduler,
    ManualPaymentGateway,
    { provide: PAYMENT_GATEWAY, useExisting: ManualPaymentGateway },
  ],
  exports: [EventPaymentsService],
})
export class EventPaymentsModule {}
