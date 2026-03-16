import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Restringe el acceso a rutas del módulo Distrito.
 * Solo usuarios con rol SECRETARY (equipo distrital) pueden acceder.
 */
@Injectable()
export class DistrictGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }
    if (user.role !== Role.SECRETARY) {
      throw new ForbiddenException('Acceso restringido al equipo distrital');
    }
    return true;
  }
}
