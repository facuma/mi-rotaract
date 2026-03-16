import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

/** Títulos de membership que dan permisos de autoridad (crear/editar informes, proyectos) */
const AUTHORITY_TITLES = [
  'secretario',
  'tesorero',
  'vicepresidente',
  'secretaria',
  'tesorera',
  'vicepresidenta',
];

/**
 * Verifica que el usuario sea autoridad del club (presidente o cargo con título).
 * Debe usarse después de ClubMemberGuard para que request.membership exista.
 */
@Injectable()
export class ClubAuthorityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const membership = request?.membership;
    if (!membership) {
      throw new ForbiddenException('No se encontró membership del club');
    }

    const isPresident = membership.isPresident === true;
    const hasAuthorityTitle =
      membership.title &&
      AUTHORITY_TITLES.includes(membership.title.toLowerCase().trim());

    if (!isPresident && !hasAuthorityTitle) {
      throw new ForbiddenException(
        'Solo autoridades del club pueden realizar esta acción',
      );
    }
    return true;
  }
}
