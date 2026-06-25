import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('e')
export class EventPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        modality: true,
        startsAt: true,
        endsAt: true,
        location: true,
        meetingUrl: true,
        maxCapacity: true,
        status: true,
        featured: true,
        imageUrl: true,
        isPaid: true,
        paymentOpensAt: true,
        paymentClosesAt: true,
        club: { select: { name: true, code: true, logoUrl: true } },
      },
    });
    if (!event || event.status === EventStatus.DRAFT)
      throw new NotFoundException('Evento no encontrado');
    const confirmedCount = await this.prisma.eventRegistration.count({
      where: { eventId: event.id, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
    });
    const seatsAvailable =
      event.maxCapacity == null ? null : Math.max(0, event.maxCapacity - confirmedCount);
    return { ...event, confirmedCount, seatsAvailable };
  }
}
