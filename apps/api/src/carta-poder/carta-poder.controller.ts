import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CartaPoderService } from './carta-poder.service';
import { CreateCartaPoderDto } from './dto/create-carta-poder.dto';

@Controller('meetings/:meetingId/carta-poder')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CartaPoderController {
  constructor(private readonly cartaPoderService: CartaPoderService) {}

  @Post()
  @Roles(Role.PRESIDENT, Role.RDR, Role.SECRETARY)
  create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateCartaPoderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cartaPoderService.create(meetingId, dto, user.id);
  }

  @Get()
  @Roles(Role.SECRETARY, Role.RDR)
  findAll(@Param('meetingId') meetingId: string) {
    return this.cartaPoderService.findByMeeting(meetingId);
  }

  @Patch(':cpId/verify')
  @Roles(Role.SECRETARY)
  verify(
    @Param('meetingId') meetingId: string,
    @Param('cpId') cpId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cartaPoderService.verify(meetingId, cpId, user.id);
  }

  @Delete(':cpId')
  @Roles(Role.SECRETARY, Role.RDR)
  remove(
    @Param('meetingId') meetingId: string,
    @Param('cpId') cpId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.cartaPoderService.remove(meetingId, cpId, user.id);
  }
}
