import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

/**
 * Verifica que el usuario pueda publicar oportunidades:
 * - SECRETARY o PRESIDENT (equipo distrital)
 * - Coordinador de algún comité
 */
@Injectable()
export class PublishOpportunityGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as CurrentUserPayload | undefined;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.role === Role.SECRETARY || user.role === Role.PRESIDENT || user.role === Role.RDR) {
      return true;
    }

    const isCoordinator = await this.prisma.committee.count({
      where: { coordinatorId: user.id, status: 'ACTIVE' },
    });

    if (isCoordinator > 0) {
      return true;
    }

    throw new ForbiddenException(
      'Solo equipo distrital o coordinadores de comité pueden publicar oportunidades',
    );
  }
}
