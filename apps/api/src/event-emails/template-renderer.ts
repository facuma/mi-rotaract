import { escapeHtml } from '../email/html-escape';

export function renderTemplate(body: string, vars: Record<string, string | undefined>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    if (v == null) return '';
    return key.endsWith('_html') ? String(v) : escapeHtml(v);
  });
}
