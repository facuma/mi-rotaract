import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventCheckInService } from './event-check-in.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInGateway } from './event-check-in.gateway';

@Controller()
export class EventCheckInController {
  constructor(
    private readonly service: EventCheckInService,
    private readonly gateway: CheckInGateway,
  ) {}

  @Get('events/:id/registrations/:regId/qr')
  @UseGuards(AuthGuard('jwt'))
  async qr(
    @Param('id') eventId: string,
    @Param('regId') regId: string,
    @Query('format') format = 'png',
    @Res() res: any,
  ) {
    const token = await this.service.ensureToken(regId);
    if (format === 'json') {
      const dataUrl = await this.service.renderQrDataUrl(token);
      return res.json({ token, payloadUrl: this.service.tokenUrl(token), imageDataUrl: dataUrl });
    }
    if (format === 'svg') {
      const svg = await this.service.renderQrSvg(token);
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }
    const png = await this.service.renderQrPng(token);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=0');
    return res.send(png);
  }

  @Get('r/:token')
  resolvePublic(@Param('token') token: string) {
    return this.service.resolvePublic(token);
  }

  @Post('events/:id/check-in')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async checkIn(
    @Param('id') eventId: string,
    @Body() dto: CheckInDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (!dto.token) throw new BadRequestException('token requerido');
    const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 200);
    const outcome = await this.service.checkIn(eventId, dto.token, user, dto.deviceInfo ?? ua);
    if (outcome.result === 'CHECKED_IN') {
      this.gateway.broadcastCheckIn(eventId, await this.service.stats(eventId), (outcome as any).registration);
    }
    return outcome;
  }

  @Post('events/:id/registrations/:regId/undo-check-in')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  async undo(
    @Param('id') eventId: string,
    @Param('regId') regId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.service.undo(eventId, regId, user, reason);
    this.gateway.broadcastCheckIn(eventId, await this.service.stats(eventId));
    return result;
  }

  @Get('events/:id/check-in/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  stats(@Param('id') eventId: string) {
    return this.service.stats(eventId);
  }
}
