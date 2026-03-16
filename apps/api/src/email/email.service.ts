import { Injectable } from '@nestjs/common';

/**
 * Servicio de email para auth e invitaciones.
 * En desarrollo: loguea el enlace de reset.
 * En producción: integrar Resend, SendGrid, nodemailer, etc.
 */
@Injectable()
export class EmailService {
  private readonly frontendUrl =
    process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/restablecer?token=${resetToken}`;
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[EmailService] sendPasswordResetEmail: integrar proveedor real en producción',
      );
      console.log(`[DEV] Reset link for ${to}: ${resetLink}`);
    } else {
      console.log(`[DEV] Password reset link for ${to}: ${resetLink}`);
    }
  }
}
