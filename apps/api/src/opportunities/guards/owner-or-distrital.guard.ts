import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

/**
 * Verifica que el usuario pueda editar/archivar una oportunidad:
 * - Creador de la oportunidad
 * - SECRETARY o PRESIDENT (equipo distrital)
 */
@Injectable()
export class OwnerOrDistritalGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as CurrentUserPayload | undefined;
    const id = request?.params?.id;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }
    if (!id) {
      throw new ForbiddenException('ID de oportunidad no especificado');
    }

    if (user.role === Role.SECRETARY || user.role === Role.PRESIDENT) {
      return true;
    }

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    if (opportunity.createdById === user.id) {
      return true;
    }

    throw new ForbiddenException(
      'Solo el creador o equipo distrital pueden modificar esta oportunidad',
    );
  }
}
