import { ForbiddenException, Injectable } from '@nestjs/common';
import { Membership } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipCheckService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveMembership(userId: string): Promise<Membership | null> {
    const now = new Date();
    return this.prisma.membership.findFirst({
      where: {
        userId,
        OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
      },
    });
  }

  async hasActiveMembership(userId: string): Promise<boolean> {
    return (await this.findActiveMembership(userId)) !== null;
  }

  async requireActiveMembership(userId: string): Promise<Membership> {
    const membership = await this.findActiveMembership(userId);
    if (!membership) {
      throw new ForbiddenException('Necesitás pertenecer a un club aprobado para realizar esta acción');
    }
    return membership;
  }
}
