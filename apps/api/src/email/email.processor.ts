import { Inject, Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_EMAIL } from '../queue/queue.constants';
import { EMAIL_PROVIDER, EmailMessage, EmailSendResult, IEmailProvider } from './email-message.types';

export const EMAIL_JOB_SEND = 'send';

@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: IEmailProvider,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailMessage>): Promise<EmailSendResult> {
    if (job.name !== EMAIL_JOB_SEND) {
      throw new Error(`Unknown email job: ${job.name}`);
    }
    const logId = job.data.metadata?.logId;
    try {
      const result = await this.provider.send(job.data);
      this.logger.log(`email sent ok jobId=${job.id} providerId=${result.providerMessageId}`);
      if (logId) {
        await this.prisma.eventEmailLog
          .update({
            where: { id: logId },
            data: { status: EmailStatus.SENT, providerMessageId: result.providerMessageId, sentAt: new Date() },
          })
          .catch(() => undefined);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (logId) {
        await this.prisma.eventEmailLog
          .update({ where: { id: logId }, data: { status: EmailStatus.FAILED, error: message } })
          .catch(() => undefined);
      }
      throw err;
    }
  }
}
