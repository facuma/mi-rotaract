import { Injectable } from '@nestjs/common';
import { ClubStatus, EventStatus, MeetingStatus, ReportStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AlertItem,
  AlertsData,
  DashboardWidget,
  IndicatorsData,
  ShortcutsData,
  UpcomingEventsData,
  UpcomingMeetingsData,
} from './dto/dashboard-response.dto';

const LIMIT_MEETINGS = 5;
const LIMIT_EVENTS = 5;
const LIMIT_ALERTS = 10;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, role: Role) {
    const widgets: DashboardWidget[] = [];

    if (role === Role.SECRETARY) {
      return this.getSecretaryDashboard(userId, widgets);
    }
    if (role === Role.PRESIDENT) {
      return this.getPresidentDashboard(userId, widgets);
    }
    return this.getParticipantDashboard(userId, widgets);
  }

  private async getSecretaryDashboard(
    userId: string,
    widgets: DashboardWidget[],
  ) {
    const [alerts, meetings, events, shortcuts] = await Promise.all([
      this.getAlertsSecretary(),
      this.getUpcomingMeetingsForSecretary(),
      this.getUpcomingEvents(),
      Promise.resolve(this.getShortcutsSecretary()),
    ]);

    if (alerts.items.length > 0) {
      widgets.push({
        id: 'alerts',
        type: 'alerts',
        title: 'Alertas',
        data: alerts,
        emptyMessage: 'Sin alertas pendientes',
      });
    }
    widgets.push({
      id: 'upcoming-meetings',
      type: 'list',
      title: 'Próximas reuniones',
      data: meetings,
      emptyMessage: 'No hay reuniones próximas',
    });
    widgets.push({
      id: 'upcoming-events',
      type: 'list',
      title: 'Próximos eventos',
      data: events,
      emptyMessage: 'No hay eventos próximos',
    });
    widgets.push({
      id: 'shortcuts',
      type: 'shortcuts',
      title: 'Accesos rápidos',
      data: shortcuts,
    });

    return { role: Role.SECRETARY, widgets };
  }

  private async getPresidentDashboard(userId: string, widgets: DashboardWidget[]) {
    const clubIds = await this.getUserClubIds(userId);
    const [alerts, meetings, events, shortcuts, indicators] = await Promise.all([
      this.getAlertsPresident(clubIds),
      this.getUpcomingMeetingsForParticipant(userId),
      this.getUpcomingEvents(),
      Promise.resolve(this.getShortcutsPresident()),
      clubIds.length > 0 ? this.getIndicators(clubIds[0]) : Promise.resolve({ items: [] }),
    ]);

    if (alerts.items.length > 0) {
      widgets.push({
        id: 'alerts',
        type: 'alerts',
        title: 'Alertas',
        data: alerts,
        emptyMessage: 'Sin alertas pendientes',
      });
    }
    widgets.push({
      id: 'upcoming-meetings',
      type: 'list',
      title: 'Próximas reuniones',
      data: meetings,
      emptyMessage: 'No tienes reuniones próximas',
    });
    widgets.push({
      id: 'upcoming-events',
      type: 'list',
      title: 'Próximos eventos',
      data: events,
      emptyMessage: 'No hay eventos próximos',
    });
    widgets.push({
      id: 'shortcuts',
      type: 'shortcuts',
      title: 'Accesos rápidos',
      data: shortcuts,
    });
    if (indicators.items.length > 0) {
      widgets.push({
        id: 'indicators',
        type: 'indicators',
        title: 'Indicadores del club',
        data: indicators,
        emptyMessage: 'No hay indicadores',
      });
    }

    return { role: Role.PRESIDENT, widgets };
  }

  private async getParticipantDashboard(userId: string, widgets: DashboardWidget[]) {
    const [meetings, events, shortcuts] = await Promise.all([
      this.getUpcomingMeetingsForParticipant(userId),
      this.getUpcomingEvents(),
      Promise.resolve(this.getShortcutsParticipant()),
    ]);

    widgets.push({
      id: 'upcoming-meetings',
      type: 'list',
      title: 'Próximas reuniones',
      data: meetings,
      emptyMessage: 'No tienes reuniones próximas',
    });
    widgets.push({
      id: 'upcoming-events',
      type: 'list',
      title: 'Próximos eventos',
      data: events,
      emptyMessage: 'No hay eventos próximos',
    });
    widgets.push({
      id: 'shortcuts',
      type: 'shortcuts',
      title: 'Accesos rápidos',
      data: shortcuts,
    });

    return { role: Role.PARTICIPANT, widgets };
  }

  private async getUserClubIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { clubId: true },
    });
    return memberships.map((m) => m.clubId);
  }

  private async getUpcomingMeetingsForParticipant(
    userId: string,
  ): Promise<UpcomingMeetingsData> {
    const now = new Date();
    const meetings = await this.prisma.meeting.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.LIVE] },
        OR: [
          { scheduledAt: { gte: now } },
          { scheduledAt: null },
          { status: MeetingStatus.LIVE },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: LIMIT_MEETINGS,
      include: { club: { select: { id: true, name: true } } },
    });

    return {
      items: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt?.toISOString() ?? '',
        status: m.status,
        href: `/meetings/${m.id}`,
      })),
      emptyActionHref: '/meetings',
    };
  }

  private async getUpcomingMeetingsForSecretary(): Promise<UpcomingMeetingsData> {
    const now = new Date();
    const meetings = await this.prisma.meeting.findMany({
      where: {
        status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.LIVE] },
        OR: [
          { scheduledAt: { gte: now } },
          { scheduledAt: null },
          { status: MeetingStatus.LIVE },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: LIMIT_MEETINGS,
      include: { club: { select: { id: true, name: true } } },
    });

    return {
      items: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        scheduledAt: m.scheduledAt?.toISOString() ?? '',
        status: m.status,
        href: `/admin/meetings/${m.id}`,
      })),
      emptyActionHref: '/admin/meetings',
    };
  }

  private async getUpcomingEvents(): Promise<UpcomingEventsData> {
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startsAt: { gte: now },
      },
      orderBy: { startsAt: 'asc' },
      take: LIMIT_EVENTS,
    });

    return {
      items: events.map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt.toISOString(),
        type: e.type,
        href: `/eventos/${e.id}`,
      })),
    };
  }

  private getShortcutsParticipant(): ShortcutsData {
    return {
      items: [
        { id: 'club', label: 'Mi Club', href: '/club' },
        { id: 'meetings', label: 'Reuniones', href: '/meetings' },
        { id: 'events', label: 'Eventos', href: '/eventos' },
      ],
    };
  }

  private getShortcutsPresident(): ShortcutsData {
    return {
      items: [
        { id: 'club', label: 'Mi Club', href: '/club' },
        { id: 'informe', label: 'Crear informe', href: '/club/informes/nuevo' },
        { id: 'meetings', label: 'Reuniones', href: '/meetings' },
        { id: 'events', label: 'Eventos', href: '/eventos' },
      ],
    };
  }

  private getShortcutsSecretary(): ShortcutsData {
    return {
      items: [
        { id: 'informes', label: 'Informes distrito', href: '/admin/district/informes' },
        { id: 'clubes', label: 'Clubes', href: '/admin/district/clubes' },
        { id: 'meetings', label: 'Reuniones', href: '/admin/meetings' },
        { id: 'comites', label: 'Comités', href: '/admin/district/comites' },
        { id: 'events', label: 'Eventos', href: '/admin/eventos' },
      ],
    };
  }

  private async getAlertsPresident(clubIds: string[]): Promise<AlertsData> {
    if (clubIds.length === 0) return { items: [] };

    const now = new Date();
    const period = await this.prisma.districtPeriod.findFirst({
      where: { isCurrent: true },
    });
    if (!period) return { items: [] };

    const reports = await this.prisma.report.findMany({
      where: {
        clubId: { in: clubIds },
        districtPeriodId: period.id,
        OR: [
          { status: ReportStatus.DRAFT },
          { status: ReportStatus.OBSERVED },
          { status: ReportStatus.REJECTED },
        ],
      },
      include: {
        club: { select: { id: true, name: true } },
        districtPeriod: { select: { name: true, endDate: true } },
      },
      take: LIMIT_ALERTS,
    });

    const items: AlertItem[] = reports.map((r) => {
      const isOverdue = period.endDate < now;
      const alertType: AlertItem['type'] =
        r.status === ReportStatus.OBSERVED || r.status === ReportStatus.REJECTED
          ? (r.status === ReportStatus.REJECTED ? 'report_rejected' : 'report_observed')
          : isOverdue
            ? 'report_overdue'
            : 'report_due';
      const message =
        r.status === ReportStatus.OBSERVED
          ? `Informe ${r.type} observado: ${r.club.name}`
          : r.status === ReportStatus.REJECTED
            ? `Informe ${r.type} rechazado: ${r.club.name}`
            : isOverdue
              ? `Informe ${r.type} vencido: ${r.club.name}`
              : `Informe ${r.type} próximo a vencer: ${r.club.name}`;
      return {
        id: r.id,
        type: alertType,
        message,
        href: `/club/informes/${r.id}`,
      };
    });

    return { items };
  }

  private async getAlertsSecretary(): Promise<{ items: AlertItem[] }> {
    const now = new Date();
    const period = await this.prisma.districtPeriod.findFirst({
      where: { isCurrent: true },
    });
    if (!period) return { items: [] };

    const [submittedReports, clubsWithOverdue] = await Promise.all([
      this.prisma.report.findMany({
        where: {
          districtPeriodId: period.id,
          status: ReportStatus.SUBMITTED,
        },
        include: { club: { select: { id: true, name: true } } },
        take: LIMIT_ALERTS,
      }),
      this.prisma.club.findMany({
        where: {
          status: ClubStatus.ACTIVE,
          reports: {
            none: {
              districtPeriodId: period.id,
            },
          },
        },
        select: { id: true, name: true },
      }),
    ]);

    const items: AlertItem[] = [];
    for (const r of submittedReports) {
      items.push({
        id: `submitted-${r.id}`,
        type: 'club_report_pending' as const,
        message: `Informe ${r.type} pendiente de revisión: ${r.club.name}`,
        href: `/admin/district/informes/${r.id}`,
      });
    }
    const periodEnded = period.endDate < now;
    if (periodEnded) {
      for (const c of clubsWithOverdue) {
        items.push({
          id: `overdue-club-${c.id}`,
          type: 'report_overdue' as const,
          message: `Club sin informe: ${c.name}`,
          href: `/admin/district/clubes/${c.id}`,
        });
      }
    }

    return { items: items.slice(0, LIMIT_ALERTS) };
  }

  private async getIndicators(clubId: string): Promise<IndicatorsData> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { informeAlDia: true, cuotaAldia: true, name: true },
    });
    if (!club) return { items: [] };

    return {
      items: [
        {
          id: 'informe',
          label: 'Informe al día',
          value: club.informeAlDia ? 'Sí' : 'No',
          href: '/club/informes',
        },
        {
          id: 'cuota',
          label: 'Cuota al día',
          value: club.cuotaAldia ? 'Sí' : 'No',
        },
      ],
    };
  }
}
