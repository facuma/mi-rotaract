import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ActaStatus, VoteChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export type ActaContent = {
  header: {
    title: string;
    date: string | null;
    startedAt: string | null;
    endedAt: string | null;
    type: string;
    quorumRequired: number | null;
    quorumMet: boolean;
    isInformationalOnly: boolean;
    club: string | null;
  };
  attendance: {
    clubs: { name: string; representative: string; isDelegate: boolean }[];
    absent: string[];
  };
  topics: {
    order: number;
    title: string;
    type: string;
    summary: string;
    vote?: {
      method: string;
      majority: string;
      yes: number;
      no: number;
      abstain: number;
      total: number;
      approved: boolean | null;
      rdrTiebreaker: boolean;
    };
  }[];
  resolutions: { number: number; text: string; approved: boolean }[];
  observations: string;
  closingNotes: string;
};

@Injectable()
export class ActaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generateDraft(meetingId: string) {
    const existing = await this.prisma.meetingActa.findUnique({ where: { meetingId } });
    if (existing) return existing;

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        club: { select: { name: true } },
        topics: { orderBy: { order: 'asc' } },
        voteSessions: {
          include: {
            topic: { select: { title: true } },
            votes: { select: { choice: true } },
          },
          orderBy: { openedAt: 'asc' },
        },
        clubAttendances: {
          include: {
            club: { select: { name: true } },
          },
        },
        cartasPoder: {
          where: { verified: true },
          include: { club: { select: { name: true } } },
        },
      },
    });
    if (!meeting) throw new NotFoundException('Reunión no encontrada');

    // Build attendance
    const presentClubs = meeting.clubAttendances.map((a) => {
      const cartaPoder = meeting.cartasPoder.find((cp) => cp.clubId === a.clubId);
      return {
        name: a.club.name,
        representative: a.attendeeUserId,
        isDelegate: a.isDelegate || !!cartaPoder,
      };
    });

    // Resolve representative names
    const userIds = presentClubs.map((c) => c.representative);
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    const attendanceClubs = presentClubs.map((c) => ({
      ...c,
      representative: userMap.get(c.representative) ?? 'Desconocido',
    }));

    // Get all enabled clubs to find absent ones
    const allClubs = await this.prisma.club.findMany({
      where: { status: 'ACTIVE', enabledForDistrictMeetings: true },
      select: { name: true },
    });
    const presentNames = new Set(attendanceClubs.map((c) => c.name));
    const absentClubs = allClubs.filter((c) => !presentNames.has(c.name)).map((c) => c.name);

    // Build topics with vote results
    const voteByTopic = new Map(meeting.voteSessions.map((vs) => [vs.topicId, vs]));
    const topics: ActaContent['topics'] = meeting.topics.map((t, i) => {
      const vs = voteByTopic.get(t.id);
      let vote: ActaContent['topics'][0]['vote'];
      if (vs && vs.status === 'CLOSED') {
        const counts = { YES: 0, NO: 0, ABSTAIN: 0 };
        for (const v of vs.votes) counts[v.choice]++;
        let approved: boolean | null = null;
        const votesForMajority = counts.YES + counts.NO;
        if (votesForMajority > 0) {
          switch (vs.requiredMajority) {
            case 'SIMPLE': approved = counts.YES > counts.NO; break;
            case 'TWO_THIRDS': approved = counts.YES >= (votesForMajority * 2) / 3; break;
            case 'THREE_QUARTERS': approved = counts.YES >= (votesForMajority * 3) / 4; break;
            default: approved = counts.YES > counts.NO;
          }
        }
        if (vs.rdrTiebreakerUsed && vs.rdrTiebreakerChoice) {
          if (vs.rdrTiebreakerChoice === VoteChoice.YES) approved = true;
          else if (vs.rdrTiebreakerChoice === VoteChoice.NO) approved = false;
        }
        vote = {
          method: vs.votingMethod,
          majority: vs.requiredMajority,
          yes: counts.YES,
          no: counts.NO,
          abstain: counts.ABSTAIN,
          total: counts.YES + counts.NO + counts.ABSTAIN,
          approved,
          rdrTiebreaker: vs.rdrTiebreakerUsed,
        };
      }
      return {
        order: i + 1,
        title: t.title,
        type: t.type,
        summary: '',
        vote,
      };
    });

    // Auto-extract resolutions from approved votes
    let resNum = 1;
    const resolutions: ActaContent['resolutions'] = topics
      .filter((t) => t.vote?.approved === true)
      .map((t) => ({
        number: resNum++,
        text: `Se aprueba: ${t.title}`,
        approved: true,
      }));

    const content: ActaContent = {
      header: {
        title: meeting.title,
        date: meeting.scheduledAt?.toISOString() ?? null,
        startedAt: meeting.startedAt?.toISOString() ?? null,
        endedAt: meeting.endedAt?.toISOString() ?? null,
        type: meeting.type,
        quorumRequired: meeting.quorumRequired,
        quorumMet: meeting.quorumMet,
        isInformationalOnly: meeting.isInformationalOnly,
        club: meeting.club?.name ?? null,
      },
      attendance: { clubs: attendanceClubs, absent: absentClubs },
      topics,
      resolutions,
      observations: '',
      closingNotes: '',
    };

    const acta = await this.prisma.meetingActa.create({
      data: {
        meetingId,
        contentJson: JSON.stringify(content),
      },
    });

    await this.audit.log({
      meetingId,
      action: 'acta.generated',
      entityType: 'MeetingActa',
      entityId: acta.id,
    });

    return acta;
  }

  async findByMeeting(meetingId: string) {
    return this.prisma.meetingActa.findUnique({ where: { meetingId } });
  }

  async update(meetingId: string, contentJson: string, userId: string) {
    const acta = await this.prisma.meetingActa.findUnique({ where: { meetingId } });
    if (!acta) throw new NotFoundException('Acta no encontrada');
    if (acta.status === ActaStatus.PUBLISHED) {
      throw new BadRequestException('No se puede editar un acta publicada');
    }
    return this.prisma.meetingActa.update({
      where: { meetingId },
      data: { contentJson, updatedAt: new Date() },
    });
  }

  async publish(meetingId: string, userId: string) {
    const acta = await this.prisma.meetingActa.findUnique({ where: { meetingId } });
    if (!acta) throw new NotFoundException('Acta no encontrada');
    if (acta.status === ActaStatus.PUBLISHED) {
      throw new BadRequestException('El acta ya está publicada');
    }
    const updated = await this.prisma.meetingActa.update({
      where: { meetingId },
      data: { status: ActaStatus.PUBLISHED, publishedAt: new Date(), publishedById: userId },
    });
    await this.audit.log({
      meetingId,
      actorUserId: userId,
      action: 'acta.published',
      entityType: 'MeetingActa',
      entityId: acta.id,
    });
    return updated;
  }

  async generatePdf(meetingId: string): Promise<Buffer> {
    const acta = await this.prisma.meetingActa.findUnique({ where: { meetingId } });
    if (!acta) throw new NotFoundException('Acta no encontrada');

    const content: ActaContent = JSON.parse(acta.contentJson);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold')
        .text('ACTA DE REUNIÓN', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
        .text(`Distrito Rotaract 4845 R.I.`, { align: 'center' });
      doc.moveDown();

      // Meeting info
      doc.fontSize(14).font('Helvetica-Bold').text(content.header.title);
      doc.fontSize(10).font('Helvetica');
      const typeLabel = content.header.type === 'ORDINARY' ? 'Ordinaria' : 'Extraordinaria';
      doc.text(`Tipo: Reunión ${typeLabel}`);
      if (content.header.date) {
        doc.text(`Fecha: ${new Date(content.header.date).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}`);
      }
      if (content.header.startedAt && content.header.endedAt) {
        const start = new Date(content.header.startedAt).toLocaleTimeString('es-AR', { timeStyle: 'short' });
        const end = new Date(content.header.endedAt).toLocaleTimeString('es-AR', { timeStyle: 'short' });
        doc.text(`Horario: ${start} — ${end}`);
      }
      doc.text(`Quórum: ${content.header.quorumMet ? 'Alcanzado' : 'No alcanzado'}${content.header.quorumRequired ? ` (${content.header.quorumRequired} requeridos)` : ''}`);
      if (content.header.isInformationalOnly) {
        doc.text('⚠ Reunión informativa — Sin quórum para tomar decisiones');
      }
      doc.moveDown();

      // Attendance
      doc.fontSize(12).font('Helvetica-Bold').text('Asistencia');
      doc.fontSize(10).font('Helvetica');
      if (content.attendance.clubs.length > 0) {
        doc.text('Clubes presentes:');
        for (const club of content.attendance.clubs) {
          const delegateTag = club.isDelegate ? ' (Delegado con Carta Poder)' : '';
          doc.text(`  • ${club.name} — ${club.representative}${delegateTag}`);
        }
      }
      if (content.attendance.absent.length > 0) {
        doc.moveDown(0.5);
        doc.text('Clubes ausentes:');
        for (const name of content.attendance.absent) {
          doc.text(`  • ${name}`);
        }
      }
      doc.moveDown();

      // Topics
      doc.fontSize(12).font('Helvetica-Bold').text('Orden del Día');
      doc.fontSize(10).font('Helvetica');
      for (const topic of content.topics) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(`${topic.order}. ${topic.title}`);
        doc.font('Helvetica');
        const typeLabels: Record<string, string> = { DISCUSSION: 'Discusión', VOTING: 'Votación', INFORMATIVE: 'Informativo' };
        doc.text(`Tipo: ${typeLabels[topic.type] ?? topic.type}`);
        if (topic.summary) doc.text(topic.summary);
        if (topic.vote) {
          const majorityLabels: Record<string, string> = { SIMPLE: 'Mayoría Simple', TWO_THIRDS: 'Dos Tercios', THREE_QUARTERS: 'Tres Cuartos' };
          const methodLabel = topic.vote.method === 'SECRET' ? 'Secreta' : 'Pública';
          doc.text(`Votación ${methodLabel} (${majorityLabels[topic.vote.majority] ?? topic.vote.majority}): A favor: ${topic.vote.yes} | En contra: ${topic.vote.no} | Abstención: ${topic.vote.abstain}`);
          if (topic.vote.approved !== null) {
            doc.font('Helvetica-Bold').text(`Resultado: ${topic.vote.approved ? 'APROBADA' : 'RECHAZADA'}`, { continued: false });
            doc.font('Helvetica');
          }
          if (topic.vote.rdrTiebreaker) {
            doc.text('(Desempate por el RDR — Art. 49)');
          }
        }
      }
      doc.moveDown();

      // Resolutions
      if (content.resolutions.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Resoluciones');
        doc.fontSize(10).font('Helvetica');
        for (const res of content.resolutions) {
          doc.text(`Resolución N° ${res.number}: ${res.text}`);
        }
        doc.moveDown();
      }

      // Observations
      if (content.observations) {
        doc.fontSize(12).font('Helvetica-Bold').text('Observaciones');
        doc.fontSize(10).font('Helvetica').text(content.observations);
        doc.moveDown();
      }

      if (content.closingNotes) {
        doc.fontSize(12).font('Helvetica-Bold').text('Notas de Cierre');
        doc.fontSize(10).font('Helvetica').text(content.closingNotes);
        doc.moveDown();
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999')
        .text(`Acta generada por Mi Rotaract — ${new Date().toLocaleString('es-AR')}`, { align: 'center' });

      doc.end();
    });
  }
}
