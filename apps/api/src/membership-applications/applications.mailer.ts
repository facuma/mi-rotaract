import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { escapeHtml } from '../email/html-escape';

const APP_URL =
  process.env.APP_BASE_URL ||
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

@Injectable()
export class ApplicationsMailer {
  private readonly logger = new Logger(ApplicationsMailer.name);

  constructor(private readonly email: EmailService) {}

  async sendApplicationReceived(params: {
    to: string;
    presidentName: string;
    applicantName: string;
    clubName: string;
    message?: string | null;
  }) {
    if (!params.to) { this.logger.warn('application_received skipped: sin email de presidente'); return; }
    const clubNameSafe = escapeHtml(params.clubName);
    const presidentNameSafe = escapeHtml(params.presidentName);
    const applicantNameSafe = escapeHtml(params.applicantName);
    const msgBlock = params.message
      ? `<p><em>Mensaje del solicitante:</em></p><blockquote>${escapeHtml(params.message)}</blockquote>`
      : '';
    await this.email.send({
      to: params.to,
      subject: sanitizeSubject(`Nueva solicitud de ingreso — ${params.clubName}`),
      html: `
        <p>Hola ${presidentNameSafe},</p>
        <p><strong>${applicantNameSafe}</strong> solicitó ingresar a <strong>${clubNameSafe}</strong>.</p>
        ${msgBlock}
        <p>Revisá la solicitud en <a href="${APP_URL}/club/solicitudes">${APP_URL}/club/solicitudes</a>.</p>
        <p>Mi Rotaract</p>
      `,
      text: `${params.applicantName} solicitó ingresar a ${params.clubName}. Revisá en ${APP_URL}/club/solicitudes`,
      metadata: { kind: 'MEMBERSHIP_APPLICATION_RECEIVED' },
    });
  }

  async sendApplicationApproved(params: { to: string; applicantName: string; clubName: string }) {
    if (!params.to) return;
    const clubNameSafe = escapeHtml(params.clubName);
    const applicantNameSafe = escapeHtml(params.applicantName);
    await this.email.send({
      to: params.to,
      subject: sanitizeSubject(`Solicitud aprobada — bienvenido/a a ${params.clubName}`),
      html: `
        <p>Hola ${applicantNameSafe},</p>
        <p>Tu solicitud de ingreso a <strong>${clubNameSafe}</strong> fue aprobada.</p>
        <p>Ya tenés acceso completo a la plataforma. Ingresá en <a href="${APP_URL}/club">${APP_URL}/club</a>.</p>
        <p>Mi Rotaract</p>
      `,
      text: `Tu solicitud de ingreso a ${params.clubName} fue aprobada. Ingresá en ${APP_URL}/club`,
      metadata: { kind: 'MEMBERSHIP_APPLICATION_APPROVED' },
    });
  }

  async sendApplicationRejected(params: { to: string; applicantName: string; clubName: string; reason?: string | null }) {
    if (!params.to) return;
    const clubNameSafe = escapeHtml(params.clubName);
    const applicantNameSafe = escapeHtml(params.applicantName);
    const reasonBlock = params.reason
      ? `<p><em>Motivo:</em></p><blockquote>${escapeHtml(params.reason)}</blockquote>`
      : '';
    await this.email.send({
      to: params.to,
      subject: sanitizeSubject(`Solicitud no aprobada — ${params.clubName}`),
      html: `
        <p>Hola ${applicantNameSafe},</p>
        <p>Tu solicitud de ingreso a <strong>${clubNameSafe}</strong> no fue aprobada.</p>
        ${reasonBlock}
        <p>Podés elegir otro club en <a href="${APP_URL}/onboarding/seleccionar-club">${APP_URL}/onboarding/seleccionar-club</a>.</p>
        <p>Mi Rotaract</p>
      `,
      text: `Tu solicitud de ingreso a ${params.clubName} no fue aprobada.${params.reason ? ' Motivo: ' + params.reason : ''}`,
      metadata: { kind: 'MEMBERSHIP_APPLICATION_REJECTED' },
    });
  }
}
