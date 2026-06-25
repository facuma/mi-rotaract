import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { escapeHtml } from '../email/html-escape';

const APP_URL =
  process.env.APP_BASE_URL ||
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

function sanitizeSubject(s: string) {
  return s.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

function fullName(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim();
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

@Injectable()
export class PresidencyMailer {
  private readonly logger = new Logger(PresidencyMailer.name);

  constructor(private readonly email: EmailService) {}

  async sendDesignation(
    pres: { id: string; memberId: string; member: { email: string; firstName: string; lastName: string }; period: { name: string; startDate: Date } },
    clubName: string,
  ) {
    const to = pres.member.email;
    if (!to) {
      this.logger.warn(`designation skipped: member ${pres.memberId} sin email`);
      return;
    }
    const name = fullName(pres.member);
    const periodLabel = pres.period.name;
    await this.email.send({
      to,
      subject: sanitizeSubject(`Has sido designado/a presidente — ${clubName} (${periodLabel})`),
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Has sido designado/a presidente del <strong>${escapeHtml(clubName)}</strong> para el período rotario <strong>${escapeHtml(periodLabel)}</strong>.</p>
        <p>La transición será efectiva el <strong>${formatDate(pres.period.startDate)}</strong>.</p>
        <p>Podés revisar los detalles en <a href="${APP_URL}/club/presidencia">${APP_URL}/club/presidencia</a>.</p>
        <p>Mi Rotaract</p>
      `,
      text: `Has sido designado/a presidente del ${clubName} para el período ${periodLabel}. Transición: ${formatDate(pres.period.startDate)}.`,
      metadata: { kind: 'PRESIDENCY_DESIGNATION', presidencyId: pres.id },
    });
  }

  async sendReminder30d(pres: { id: string; member: { email: string; firstName: string; lastName: string }; period: { name: string; startDate: Date } }) {
    const to = pres.member.email;
    if (!to) return;
    const name = fullName(pres.member);
    await this.email.send({
      to,
      subject: sanitizeSubject(`Recordatorio: asumís la presidencia el ${formatDate(pres.period.startDate)}`),
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Tu presidencia en el período <strong>${escapeHtml(pres.period.name)}</strong> comienza el <strong>${formatDate(pres.period.startDate)}</strong> (en 30 días).</p>
        <p>Es un buen momento para coordinar la transición con el presidente saliente.</p>
      `,
      text: `Recordatorio: tu presidencia comienza el ${formatDate(pres.period.startDate)}.`,
      metadata: { kind: 'PRESIDENCY_REMINDER_30D', presidencyId: pres.id },
    });
  }

  async sendNoSuccessorWarning(params: {
    club: { id: string; name: string };
    current: { id: string; member: { email: string; firstName: string; lastName: string } };
    daysToChange: number;
    periodName: string;
  }) {
    const to = params.current.member.email;
    if (!to) return;
    const name = fullName(params.current.member);
    await this.email.send({
      to,
      subject: sanitizeSubject(`Urgente: falta designar sucesor para ${params.club.name}`),
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Faltan <strong>${params.daysToChange} días</strong> para el inicio del período <strong>${escapeHtml(params.periodName)}</strong> y aún no hay presidente sucesor designado en <strong>${escapeHtml(params.club.name)}</strong>.</p>
        <p>Por favor ingresá a <a href="${APP_URL}/club/presidencia">${APP_URL}/club/presidencia</a> y designá un sucesor, o tu mandato será extendido automáticamente.</p>
      `,
      text: `Faltan ${params.daysToChange} días para ${params.periodName} y no hay sucesor designado en ${params.club.name}.`,
      metadata: { kind: 'PRESIDENCY_NO_SUCCESSOR_60D', clubId: params.club.id, presidencyId: params.current.id },
    });
  }

  async sendTransition(pres: { id: string; member: { email: string; firstName: string; lastName: string }; period: { name: string } }) {
    const to = pres.member.email;
    if (!to) return;
    const name = fullName(pres.member);
    await this.email.send({
      to,
      subject: sanitizeSubject(`Ya asumiste como presidente — período ${pres.period.name}`),
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Hoy asumís como presidente para el período rotario <strong>${escapeHtml(pres.period.name)}</strong>. Felicitaciones y éxito en tu gestión.</p>
        <p>Desde ahora tenés acceso completo al panel de tu club en <a href="${APP_URL}/club">${APP_URL}/club</a>.</p>
      `,
      text: `Asumiste como presidente del período ${pres.period.name}.`,
      metadata: { kind: 'PRESIDENCY_TRANSITION', presidencyId: pres.id },
    });
  }

  async sendRevoked(pres: { id: string; member: { email: string; firstName: string; lastName: string }; period: { name: string } }) {
    const to = pres.member.email;
    if (!to) return;
    const name = fullName(pres.member);
    await this.email.send({
      to,
      subject: `Tu designación como presidente fue cancelada`,
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Se cancela tu designación como presidente para el período <strong>${escapeHtml(pres.period.name)}</strong>.</p>
        <p>Si creés que es un error, contactá a la autoridad actual de tu club.</p>
      `,
      text: `Se cancela tu designación como presidente para ${pres.period.name}.`,
      metadata: { kind: 'PRESIDENCY_REVOKED', presidencyId: pres.id },
    });
  }
}
