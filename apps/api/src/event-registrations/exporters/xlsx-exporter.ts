import { Injectable } from '@nestjs/common';
import { neutralizeCsvFormula } from '../../common/bulk/csv-safe';
import { ExportContext, ExportResult, RegistrationExporter } from './registration-exporter.interface';

function collectFormFields(schema: unknown): { id: string; label: string }[] {
  if (!schema) return [];
  const out: { id: string; label: string }[] = [];
  const o = schema as any;
  if (!Array.isArray(o.sections)) return [];
  for (const s of o.sections) {
    for (const f of s.fields ?? []) {
      out.push({ id: f.id, label: f.label });
    }
  }
  return out;
}

@Injectable()
export class XlsxRegistrationExporter implements RegistrationExporter {
  format = 'xlsx';

  async export(rows: any[], ctx: ExportContext): Promise<ExportResult> {
    let ExcelJS: any;
    try {
      const mod = await import('exceljs');
      ExcelJS = (mod as any).default ?? mod;
      if (!ExcelJS?.Workbook) throw new Error('exceljs no expone Workbook');
    } catch {
      throw new Error('No se pudo cargar `exceljs`. Verificá que esté instalado.');
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mi Rotaract';
    wb.created = new Date();
    const formFields = collectFormFields(ctx.formSchema);
    const sheet = wb.addWorksheet('Inscriptos');
    const baseCols = [
      { header: 'Nombre', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'Estado', key: 'status', width: 18 },
      { header: 'Pos. espera', key: 'waitlist', width: 12 },
      { header: 'Inscripto el', key: 'createdAt', width: 18 },
      { header: 'Acreditado el', key: 'checkedInAt', width: 18 },
      { header: 'Cancelado el', key: 'cancelledAt', width: 18 },
    ];
    const formCols = formFields.map((f) => ({ header: f.label, key: `form_${f.id}`, width: 22 }));
    const installmentCols = ctx.installments.map((i) => ({ header: `Cuota: ${i.label}`, key: `inst_${i.id}`, width: 22 }));
    const mealCols = ctx.meals.map((m) => ({ header: `Comida: ${m.name}`, key: `meal_${m.id}`, width: 18 }));
    sheet.columns = [...baseCols, ...formCols, ...installmentCols, ...mealCols];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };
    for (const r of rows) {
      const formData = (() => {
        if (!r.additionalData) return {};
        try {
          const parsed = JSON.parse(r.additionalData);
          return parsed.formData ?? {};
        } catch {
          return {};
        }
      })();
      const row: Record<string, unknown> = {
        fullName: neutralizeCsvFormula(r.fullName),
        email: neutralizeCsvFormula(r.email),
        phone: neutralizeCsvFormula(r.phone ?? ''),
        status: r.status,
        waitlist: r.waitlistPosition ?? '',
        createdAt: r.createdAt,
        checkedInAt: r.checkedInAt ?? '',
        cancelledAt: r.cancelledAt ?? '',
      };
      for (const f of formFields) {
        const v = formData[f.id];
        const raw = Array.isArray(v) ? v.join(', ') : (v ?? '');
        row[`form_${f.id}`] = neutralizeCsvFormula(raw);
      }
      for (const inst of ctx.installments) {
        const p = (r.payments ?? []).find((pp: any) => pp.installmentId === inst.id);
        if (!p) {
          row[`inst_${inst.id}`] = '—';
        } else if (p.status === 'PAID') {
          const when = p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '';
          row[`inst_${inst.id}`] = `PAID (${when} · ${p.method ?? ''})`;
        } else {
          row[`inst_${inst.id}`] = p.status;
        }
      }
      for (const meal of ctx.meals) {
        const c = (r.mealConsumptions ?? []).find((cc: any) => cc.mealId === meal.id);
        row[`meal_${meal.id}`] = c ? `✓ ${c.consumedAt.toISOString().slice(11, 16)}` : '';
      }
      sheet.addRow(row);
    }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
    const summary = wb.addWorksheet('Resumen');
    summary.columns = [
      { header: 'Métrica', key: 'k', width: 40 },
      { header: 'Valor', key: 'v', width: 24 },
    ];
    summary.getRow(1).font = { bold: true };
    const confirmed = rows.filter((r) => r.status === 'CONFIRMED').length;
    const waitlisted = rows.filter((r) => r.status === 'WAITLISTED').length;
    const cancelled = rows.filter((r) => r.status === 'CANCELLED').length;
    const checkedIn = rows.filter((r) => r.checkedInAt).length;
    summary.addRow({ k: 'Evento', v: ctx.event.title });
    summary.addRow({ k: 'Total inscriptos', v: rows.length });
    summary.addRow({ k: 'Confirmados', v: confirmed });
    summary.addRow({ k: 'En lista de espera', v: waitlisted });
    summary.addRow({ k: 'Cancelados', v: cancelled });
    summary.addRow({ k: 'Acreditados (check-in)', v: checkedIn });
    summary.addRow({ k: 'Tasa de asistencia', v: confirmed > 0 ? `${((checkedIn / confirmed) * 100).toFixed(1)}%` : '—' });
    if (ctx.installments.length > 0) {
      summary.addRow({ k: '', v: '' });
      summary.addRow({ k: '— Cuotas —', v: '' });
      for (const inst of ctx.installments) {
        const paid = rows.reduce(
          (acc, r) => acc + ((r.payments ?? []).find((p: any) => p.installmentId === inst.id)?.status === 'PAID' ? 1 : 0),
          0,
        );
        summary.addRow({ k: `${inst.label} pagadas`, v: `${paid}/${rows.length}` });
      }
    }
    if (ctx.meals.length > 0) {
      summary.addRow({ k: '', v: '' });
      summary.addRow({ k: '— Comidas —', v: '' });
      for (const meal of ctx.meals) {
        const consumed = rows.reduce(
          (acc, r) => acc + ((r.mealConsumptions ?? []).some((c: any) => c.mealId === meal.id) ? 1 : 0),
          0,
        );
        summary.addRow({ k: `${meal.name} consumidas`, v: `${consumed}/${confirmed}` });
      }
    }
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `inscriptos-${ctx.event.slug ?? ctx.event.id}-${date}.xlsx`;
    return { buffer, filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
}
