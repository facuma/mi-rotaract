export interface ExportContext {
  event: {
    id: string;
    title: string;
    slug: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
  };
  installments: { id: string; label: string; order: number }[];
  meals: { id: string; name: string; order: number }[];
  formSchema: unknown;
  ticket: { amount: any; currency: string } | null;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export interface RegistrationExporter {
  format: string;
  export(rows: any[], ctx: ExportContext): Promise<ExportResult>;
}
