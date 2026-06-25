import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { DomainEvents } from '../events-bus/domain-events';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventsBusService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notif = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        eventId: input.eventId,
        data: input.data ? JSON.stringify(input.data) : null,
      },
    });
    this.bus.emit(DomainEvents.NotificationCreated, {
      userId: input.userId,
      notification: notif,
    });
    return notif;
  }

  async createMany(inputs: CreateNotificationInput[]) {
    for (const input of inputs) await this.create(input);
  }

  async list(userId: string, options: { limit?: number; onlyUnread?: boolean } = {}) {
    const limit = Math.min(options.limit ?? 20, 100);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(options.onlyUnread ? { readAt: null } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);
    return { items, unreadCount };
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (n.readAt) return n;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
