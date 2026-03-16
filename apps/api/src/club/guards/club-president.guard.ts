import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Verifica que el usuario sea presidente del club.
 * Debe usarse después de ClubMemberGuard para que request.membership exista.
 */
@Injectable()
export class ClubPresidentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const membership = request?.membership;
    if (!membership) {
      throw new ForbiddenException('No se encontró membership del club');
    }

    if (membership.isPresident !== true) {
      throw new ForbiddenException(
        'Solo el presidente del club puede realizar esta acción',
      );
    }
    return true;
  }
}
