export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer | string }[];
  metadata?: { logId?: string; [key: string]: unknown };
}

export interface EmailSendResult {
  providerMessageId: string;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
