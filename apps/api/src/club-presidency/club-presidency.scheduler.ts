import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ClubPresidencyService } from './club-presidency.service';

@Injectable()
export class ClubPresidencyScheduler {
  private readonly logger = new Logger(ClubPresidencyScheduler.name);

  constructor(private readonly service: ClubPresidencyService) {}

  @Cron('0 3 * * *', { name: 'presidency-transition' })
  async runTransition() {
    try {
      const result = await this.service.runPresidencyTransition();
      this.logger.log(`presidency transition: activated=${result.activated} extended=${result.extended}`);
    } catch (err) {
      this.logger.error(`runPresidencyTransition failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  @Cron('0 9 * * *', { name: 'presidency-notifications' })
  async notifyStatus() {
    try {
      const result = await this.service.notifySuccessionStatus();
      this.logger.log(`presidency notifications: reminders=${result.reminders} warnings=${result.warnings}`);
    } catch (err) {
      this.logger.error(`notifySuccessionStatus failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
