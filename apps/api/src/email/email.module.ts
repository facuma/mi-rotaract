import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { ResendProvider } from './providers/resend.provider';
import { EMAIL_PROVIDER } from './email-message.types';
import { QUEUE_EMAIL } from '../queue/queue.constants';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAIL })],
  providers: [
    EmailService,
    EmailProcessor,
    ResendProvider,
    { provide: EMAIL_PROVIDER, useExisting: ResendProvider },
  ],
  exports: [EmailService],
})
export class EmailModule {}
