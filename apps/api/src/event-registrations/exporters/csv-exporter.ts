import { Injectable } from '@nestjs/common';
import { neutralizeCsvFormula } from '../../common/bulk/csv-safe';
import { ExportContext, ExportResult, RegistrationExporter } from './registration-exporter.interface';

function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = String(neutralizeCsvFormula(raw) ?? '');
  return `"${safe.replace(/"/g, '""')}"`;
}

@Injectable()
export class CsvRegistrationExporter implements RegistrationExporter {
  format = 'csv';

  async export(rows: any[], ctx: ExportContext): Promise<ExportResult> {
    const headers = [
      'fullName',
      'email',
      'phone',
      'status',
      'waitlistPosition',
      'checkedInAt',
      'createdAt',
    ];
    const lines = rows.map((r) =>
      [
        r.fullName,
        r.email,
        r.phone ?? '',
        r.status,
        r.waitlistPosition?.toString() ?? '',
        r.checkedInAt?.toISOString() ?? '',
        r.createdAt.toISOString(),
      ]
        .map(csvEscape)
        .join(','),
    );
    const csv = '﻿' + [headers.join(','), ...lines].join('\n') + '\n';
    const filename = `inscriptos-${(ctx.event.slug ?? ctx.event.id).slice(0, 40)}.csv`;
    return { buffer: Buffer.from(csv, 'utf8'), filename, contentType: 'text/csv; charset=utf-8' };
  }
}
