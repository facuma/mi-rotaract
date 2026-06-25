import { EmailTemplateType } from '@prisma/client';

export const DEFAULT_TEMPLATES: Array<{
  type: EmailTemplateType;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}> = [
  {
    type: EmailTemplateType.REGISTRATION_CONFIRMATION,
    subject: 'Inscripción confirmada — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Confirmamos tu inscripción a <strong>{{eventTitle}}</strong>.</p>
<ul>
  <li><strong>Fecha:</strong> {{startsAt}}</li>
  <li><strong>Lugar:</strong> {{location}}</li>
</ul>
<p>El día del evento, presentá este código QR para acreditarte:</p>
<p><a href="{{checkInUrl}}">Ver mi QR</a></p>
<p>¡Te esperamos!</p>`,
    bodyText: 'Tu inscripción a {{eventTitle}} fue confirmada. Tu QR: {{checkInUrl}}',
  },
  {
    type: EmailTemplateType.WAITLIST_PROMOTED,
    subject: 'Tenés lugar en {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Se liberó un lugar y tu inscripción a <strong>{{eventTitle}}</strong> quedó confirmada.</p>
<p><strong>Fecha:</strong> {{startsAt}} — <strong>Lugar:</strong> {{location}}</p>
<p>Tu QR: <a href="{{checkInUrl}}">{{checkInUrl}}</a></p>`,
  },
  {
    type: EmailTemplateType.EVENT_CANCELLED,
    subject: 'Cancelado: {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Lamentamos avisarte que <strong>{{eventTitle}}</strong> fue cancelado.</p>
<p>Si efectuaste un pago, te contactaremos por el reembolso.</p>`,
  },
  {
    type: EmailTemplateType.REMINDER,
    subject: 'Recordatorio: {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Te recordamos que <strong>{{eventTitle}}</strong> arranca el {{startsAt}} en {{location}}.</p>
<p><a href="{{checkInUrl}}">Ver mi QR</a></p>`,
  },
  {
    type: EmailTemplateType.PAYMENT_WINDOW_OPEN,
    subject: 'Ya podés pagar tu inscripción — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Se habilitó la ventana de pago para <strong>{{eventTitle}}</strong>.</p>
<p><a href="{{paymentUrl}}">Pagar ahora</a></p>`,
  },
  {
    type: EmailTemplateType.PAYMENT_WINDOW_CLOSING,
    subject: 'Última oportunidad para pagar — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>La ventana de pago de <strong>{{eventTitle}}</strong> cierra en menos de 24 hs.</p>
<p><a href="{{paymentUrl}}">Pagar ahora</a></p>`,
  },
  {
    type: EmailTemplateType.PAYMENT_RECORDED,
    subject: 'Pago registrado — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Registramos tu pago de <strong>{{installmentLabel}}</strong> ({{paidAmount}} {{currency}}) para <strong>{{eventTitle}}</strong>.</p>
<p>Método: {{paymentMethod}} — Fecha: {{paidAt}}</p>
<p>Te recordamos que todavía tenés cuotas pendientes. Podés ver el detalle en <a href="{{appBaseUrl}}">tu perfil</a>.</p>`,
    bodyText: 'Registramos tu pago de {{installmentLabel}} por {{paidAmount}} {{currency}} para {{eventTitle}}.',
  },
  {
    type: EmailTemplateType.PAYMENT_COMPLETE,
    subject: 'Pago completo — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Terminaste de pagar <strong>{{eventTitle}}</strong>. Tu inscripción quedó <strong>confirmada</strong>.</p>
<p>Presentá este QR el día del evento: <a href="{{checkInUrl}}">{{checkInUrl}}</a></p>`,
  },
  {
    type: EmailTemplateType.INSTALLMENT_DUE_REMINDER,
    subject: 'Vence tu cuota — {{eventTitle}}',
    bodyHtml: `<p>Hola {{fullName}},</p>
<p>Te recordamos que <strong>{{installmentLabel}}</strong> ({{dueAmount}} {{currency}}) vence el {{dueDate}} para <strong>{{eventTitle}}</strong>.</p>
<p>Contactá a los organizadores para coordinar el pago.</p>`,
  },
];
