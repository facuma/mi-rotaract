import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, Length } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class SetActiveClubDto {
  @IsString()
  @Length(1, 64)
  clubId: string;
}

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class ActiveClubController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('active-club')
  async setActiveClub(@Body() body: SetActiveClubDto, @CurrentUser() user: { id: string }) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_clubId: { userId: user.id, clubId: body.clubId } },
      include: { club: { select: { id: true, name: true, code: true } } },
    });
    if (!membership) throw new ForbiddenException('No pertenece al club seleccionado');
    const now = new Date();
    if (membership.activeUntil && membership.activeUntil < now)
      throw new ForbiddenException('La membership está vencida');
    await this.audit.log({
      clubId: body.clubId,
      actorUserId: user.id,
      action: 'user.active_club_changed',
      entityType: 'Membership',
      entityId: membership.id,
      metadata: { clubId: body.clubId },
    });
    return { clubId: membership.club.id, clubName: membership.club.name, clubCode: membership.club.code };
  }
}
