import { Global, Logger, Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_EMAIL, QUEUE_EVENTS, QUEUE_PAYMENTS } from './queue.constants';

function parseRedisUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 6379,
    password: u.password || undefined,
  };
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = parseRedisUrl(redisUrl);

@Global()
@Module({
  imports: [
    BullModule.forRoot({ connection }),
    BullModule.registerQueue(
      { name: QUEUE_EMAIL },
      { name: QUEUE_EVENTS },
      { name: QUEUE_PAYMENTS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule implements OnModuleInit {
  private readonly logger = new Logger(QueueModule.name);

  onModuleInit() {
    this.logger.log(
      `Queues ready (${QUEUE_EMAIL}, ${QUEUE_EVENTS}, ${QUEUE_PAYMENTS}) on ${connection.host}:${connection.port}`,
    );
  }
}
