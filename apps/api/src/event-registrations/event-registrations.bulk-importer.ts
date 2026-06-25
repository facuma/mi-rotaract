import { Injectable } from '@nestjs/common';
import { RegistrationStatus } from '@prisma/client';
import { BulkImporter } from '../common/bulk/bulk-importer';
import { CsvParserService } from '../common/bulk/csv-parser.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventRegistrationsBulkImporterFactory {
  constructor(
    private readonly csv: CsvParserService,
    private readonly prisma: PrismaService,
  ) {}

  forEvent(eventId: string): EventRegistrationsBulkImporter {
    return new EventRegistrationsBulkImporter(this.csv, this.prisma, eventId);
  }
}

interface ParsedRow {
  email: string;
  fullName: string;
  phone?: string;
  additionalNotes?: string;
}

class EventRegistrationsBulkImporter extends BulkImporter<ParsedRow> {
  constructor(
    csv: CsvParserService,
    private readonly prisma: PrismaService,
    private readonly eventId: string,
  ) {
    super(csv);
  }

  csvHeaders(): string[] {
    return ['email', 'fullName', 'phone', 'additionalNotes'];
  }

  parseRow(row: Record<string, string>): ParsedRow {
    const email = row.email?.trim().toLowerCase();
    const fullName = row.fullName?.trim();
    if (!email) throw new Error('email es obligatorio');
    if (!fullName) throw new Error('fullName es obligatorio');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email inválido');
    return {
      email,
      fullName,
      phone: row.phone?.trim() || undefined,
      additionalNotes: row.additionalNotes?.trim() || undefined,
    };
  }

  async persist(rows: ParsedRow[]): Promise<{ createdIds: string[] }> {
    const createdIds: string[] = [];
    for (const row of rows) {
      const reg = await this.prisma.eventRegistration.upsert({
        where: { eventId_email: { eventId: this.eventId, email: row.email } },
        create: {
          eventId: this.eventId,
          email: row.email,
          fullName: row.fullName,
          phone: row.phone,
          additionalData: row.additionalNotes ? JSON.stringify({ notes: row.additionalNotes }) : null,
          status: RegistrationStatus.CONFIRMED,
        },
        update: {
          fullName: row.fullName,
          phone: row.phone,
          status: RegistrationStatus.CONFIRMED,
          cancelledAt: null,
        },
      });
      createdIds.push(reg.id);
    }
    return { createdIds };
  }
}
