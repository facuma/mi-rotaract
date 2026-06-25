import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailMessage, EmailSendResult, IEmailProvider } from '../email-message.types';

@Injectable()
export class ResendProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly client: Resend | null;
  private readonly defaultFrom: string;
  private readonly dryRun: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.EMAIL_FROM || 'no-reply@example.com';
    this.dryRun = !apiKey || process.env.EMAIL_DRY_RUN === 'true';
    this.client = apiKey ? new Resend(apiKey) : null;
    if (this.dryRun) {
      this.logger.warn('Resend en modo DRY_RUN: los emails se logean en consola en lugar de enviarse');
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from || this.defaultFrom;
    const to = Array.isArray(message.to) ? message.to : [message.to];
    if (this.dryRun || !this.client) {
      const id = `dryrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.logger.log(`[DRY_RUN] -> ${to.join(', ')} | ${message.subject} (msgId=${id})`);
      return { providerMessageId: id };
    }
    const res = await this.client.emails.send({
      from,
      to,
      subject: message.subject,
      html: message.html ?? '',
      text: message.text,
      replyTo: message.replyTo,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
      })),
    });
    if (res.error) {
      throw new Error(`Resend error: ${res.error.message}`);
    }
    return { providerMessageId: res.data?.id ?? 'unknown' };
  }
}
