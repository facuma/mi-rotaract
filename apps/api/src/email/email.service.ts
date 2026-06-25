import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_EMAIL } from '../queue/queue.constants';
import { EMAIL_JOB_SEND } from './email.processor';
import { EmailMessage } from './email-message.types';

function resolveFrontendUrl(): string {
  const candidate =
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  try {
    const u = new URL(candidate);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error(`invalid protocol: ${u.protocol}`);
    return u.origin;
  } catch (err) {
    throw new Error(
      `Frontend URL inválida "${candidate}": ${err instanceof Error ? err.message : 'unknown'}. Configurá APP_BASE_URL/FRONTEND_URL con una URL absoluta.`,
    );
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl = resolveFrontendUrl();

  constructor(@InjectQueue(QUEUE_EMAIL) private readonly queue: Queue) {}

  async send(message: EmailMessage): Promise<void> {
    await this.queue.add(EMAIL_JOB_SEND, message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600, count: 500 },
      removeOnFail: { age: 24 * 3600 },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/restablecer?token=${resetToken}`;
    await this.send({
      to,
      subject: 'Restablecer contraseña — Mi Rotaract',
      html: `
        <p>Recibimos un pedido para restablecer tu contraseña.</p>
        <p><a href="${resetLink}">Hacé clic acá para crear una nueva</a> (válido por 1 hora).</p>
        <p>Si no fuiste vos, podés ignorar este correo.</p>
      `,
      text: `Restablecé tu contraseña: ${resetLink}`,
    });
    this.logger.log(`password reset queued for ${to}`);
  }
}
