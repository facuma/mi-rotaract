import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MealScanResult, RegistrationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsBusService } from '../events-bus/events-bus.service';
import { verifyCheckInToken } from '../event-check-in/check-in-token';
import { UpsertMealDto } from './dto/upsert-meal.dto';

const HUMAN_RESULT: Record<string, string> = {
  CONSUMED: 'Comida registrada',
  ALREADY_CONSUMED: 'Ya consumió esta comida',
  OUTSIDE_WINDOW: 'Fuera del horario de servicio',
  REGISTRATION_NOT_CONFIRMED: 'Inscripción no confirmada',
  WRONG_EVENT: 'QR de otro evento',
  INVALID_TOKEN: 'QR inválido',
  MEAL_NOT_FOUND: 'Comida no encontrada',
};

@Injectable()
export class EventMealsService {
  private readonly logger = new Logger(EventMealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bus: EventsBusService,
  ) {}

  async list(eventId: string) {
    return this.prisma.eventMeal.findMany({
      where: { eventId },
      orderBy: [{ order: 'asc' }, { servedAt: 'asc' }],
    });
  }

  async create(eventId: string, dto: UpsertMealDto, actorUserId: string) {
    await this.assertEventExists(eventId);
    this.validateWindow(dto);
    const meal = await this.prisma.eventMeal.create({
      data: {
        eventId,
        name: dto.name.trim(),
        servedAt: new Date(dto.servedAt),
        windowStart: new Date(dto.windowStart),
        windowEnd: new Date(dto.windowEnd),
        order: dto.order,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'event_meal.created',
      entityType: 'event_meal',
      entityId: meal.id,
      metadata: { eventId, name: meal.name },
    });
    return meal;
  }

  async update(eventId: string, mealId: string, dto: UpsertMealDto, actorUserId: string) {
    await this.assertMealBelongsToEvent(eventId, mealId);
    this.validateWindow(dto);
    const meal = await this.prisma.eventMeal.update({
      where: { id: mealId },
      data: {
        name: dto.name.trim(),
        servedAt: new Date(dto.servedAt),
        windowStart: new Date(dto.windowStart),
        windowEnd: new Date(dto.windowEnd),
        order: dto.order,
      },
    });
    await this.audit.log({
      actorUserId,
      action: 'event_meal.updated',
      entityType: 'event_meal',
      entityId: meal.id,
      metadata: { eventId },
    });
    return meal;
  }

  async remove(eventId: string, mealId: string, actorUserId: string) {
    await this.assertMealBelongsToEvent(eventId, mealId);
    await this.prisma.eventMeal.delete({ where: { id: mealId } });
    await this.audit.log({
      actorUserId,
      action: 'event_meal.deleted',
      entityType: 'event_meal',
      entityId: mealId,
      metadata: { eventId },
    });
  }

  async scan(
    eventId: string,
    mealId: string,
    token: string,
    actor: { id: string; role: string },
    deviceInfo?: string,
  ) {
    await this.assertCanScan(eventId, actor);
    const meal = await this.prisma.eventMeal.findUnique({ where: { id: mealId } });
    if (!meal || meal.eventId !== eventId) {
      return { result: MealScanResult.MEAL_NOT_FOUND, message: HUMAN_RESULT.MEAL_NOT_FOUND };
    }
    const now = new Date();
    if (now < meal.windowStart || now > meal.windowEnd) {
      return {
        result: MealScanResult.OUTSIDE_WINDOW,
        message: `${HUMAN_RESULT.OUTSIDE_WINDOW} (${meal.windowStart.toLocaleTimeString('es-AR')} - ${meal.windowEnd.toLocaleTimeString('es-AR')})`,
      };
    }
    if (!verifyCheckInToken(token)) {
      return { result: MealScanResult.INVALID_TOKEN, message: HUMAN_RESULT.INVALID_TOKEN };
    }
    const reg = await this.prisma.eventRegistration.findUnique({ where: { checkInToken: token } });
    if (!reg) {
      return { result: MealScanResult.INVALID_TOKEN, message: HUMAN_RESULT.INVALID_TOKEN };
    }
    if (reg.eventId !== eventId) {
      return { result: MealScanResult.WRONG_EVENT, message: HUMAN_RESULT.WRONG_EVENT };
    }
    if (reg.status !== RegistrationStatus.CONFIRMED) {
      return {
        result: MealScanResult.REGISTRATION_NOT_CONFIRMED,
        message: HUMAN_RESULT.REGISTRATION_NOT_CONFIRMED,
        registration: { id: reg.id, fullName: reg.fullName, email: reg.email },
      };
    }
    const existing = await this.prisma.eventMealConsumption.findUnique({
      where: { mealId_registrationId: { mealId, registrationId: reg.id } },
    });
    if (existing) {
      return {
        result: MealScanResult.ALREADY_CONSUMED,
        message: HUMAN_RESULT.ALREADY_CONSUMED,
        registration: { id: reg.id, fullName: reg.fullName, email: reg.email },
        consumedAt: existing.consumedAt,
      };
    }
    const consumption = await this.prisma.eventMealConsumption.create({
      data: { mealId, registrationId: reg.id, scannedById: actor.id, deviceInfo },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'meal.consumed',
      entityType: 'event_meal_consumption',
      entityId: consumption.id,
      metadata: { eventId, mealId, registrationId: reg.id },
    });
    return {
      result: MealScanResult.CONSUMED,
      message: HUMAN_RESULT.CONSUMED,
      registration: { id: reg.id, fullName: reg.fullName, email: reg.email },
      consumedAt: consumption.consumedAt,
    };
  }

  async stats(eventId: string, mealId: string) {
    await this.assertMealBelongsToEvent(eventId, mealId);
    const [totalConfirmed, consumed, lastConsumptions] = await Promise.all([
      this.prisma.eventRegistration.count({ where: { eventId, status: RegistrationStatus.CONFIRMED } }),
      this.prisma.eventMealConsumption.count({ where: { mealId } }),
      this.prisma.eventMealConsumption.findMany({
        where: { mealId },
        orderBy: { consumedAt: 'desc' },
        take: 10,
        include: { registration: { select: { id: true, fullName: true, email: true } } },
      }),
    ]);
    return {
      totalConfirmed,
      consumed,
      remaining: Math.max(0, totalConfirmed - consumed),
      consumeRate: totalConfirmed > 0 ? consumed / totalConfirmed : 0,
      lastConsumptions: lastConsumptions.map((c) => ({ id: c.id, consumedAt: c.consumedAt, registration: c.registration })),
    };
  }

  async statsPerMeal(eventId: string) {
    const [meals, totalConfirmed] = await Promise.all([
      this.prisma.eventMeal.findMany({
        where: { eventId },
        orderBy: [{ order: 'asc' }],
        include: { _count: { select: { consumptions: true } } },
      }),
      this.prisma.eventRegistration.count({ where: { eventId, status: RegistrationStatus.CONFIRMED } }),
    ]);
    return {
      totalConfirmed,
      meals: meals.map((m) => ({ id: m.id, name: m.name, order: m.order, servedAt: m.servedAt, consumed: m._count.consumptions })),
    };
  }

  validateWindow(dto: { windowStart: string; windowEnd: string }) {
    const start = new Date(dto.windowStart);
    const end = new Date(dto.windowEnd);
    if (end <= start) {
      throw new ForbiddenException('La ventana de servicio debe terminar después de iniciar');
    }
  }

  async assertEventExists(eventId: string) {
    const e = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!e) throw new NotFoundException('Evento no encontrado');
  }

  async assertMealBelongsToEvent(eventId: string, mealId: string) {
    const m = await this.prisma.eventMeal.findUnique({ where: { id: mealId }, select: { eventId: true } });
    if (!m || m.eventId !== eventId) throw new NotFoundException('Comida no encontrada');
  }

  async assertCanScan(eventId: string, actor: { id: string; role: string }) {
    if (actor.role === Role.DISTRICT_SECRETARY) return;
    if (actor.role === Role.PRESIDENT || actor.role === Role.DISTRICT_RDR) {
      const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { clubId: true } });
      if (event?.clubId) {
        const memberships = await this.prisma.membership.findMany({
          where: { userId: actor.id, isPresident: true },
          select: { clubId: true },
        });
        if (memberships.some((m) => m.clubId === event.clubId)) return;
      }
    }
    throw new ForbiddenException('Sin permiso para escanear comidas');
  }
}
