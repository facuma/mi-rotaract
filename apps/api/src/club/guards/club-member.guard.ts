import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

/**
 * Verifica que el usuario tenga una membership activa en algún club.
 * Establece request.clubId y request.membership para uso downstream.
 * Prioriza el club donde es presidente; si no, usa el primero con membership activa.
 */
@Injectable()
export class ClubMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as CurrentUserPayload | undefined;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const now = new Date();
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: user.id,
        OR: [
          { activeUntil: null },
          { activeUntil: { gt: now } },
        ],
      },
      include: { club: true },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('No pertenece a ningún club');
    }

    // Priorizar club donde es presidente
    const presidentMembership = memberships.find((m) => m.isPresident);
    const membership = presidentMembership ?? memberships[0];

    request.clubId = membership.clubId;
    request.membership = membership;
    return true;
  }
}
