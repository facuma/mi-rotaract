import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventPermissionsService } from './event-permissions.service';

@Injectable()
export class EventPermissionsScheduler {
  private readonly logger = new Logger(EventPermissionsScheduler.name);

  constructor(private readonly service: EventPermissionsService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'expire-event-permissions' })
  async handleExpire() {
    try {
      await this.service.expireDue();
    } catch (err) {
      this.logger.error(`expireDue() failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
