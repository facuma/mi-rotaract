import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventPaymentsService } from './event-payments.service';

@Injectable()
export class EventPaymentsScheduler {
  private readonly logger = new Logger(EventPaymentsScheduler.name);

  constructor(private readonly payments: EventPaymentsService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'event-payments-overdue' })
  async markOverdue() {
    const updated = await this.payments.markOverduePayments();
    if (updated > 0) {
      this.logger.log(`markOverduePayments: ${updated} cuota(s) marcadas OVERDUE`);
    }
  }
}
