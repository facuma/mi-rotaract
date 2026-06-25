import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventRegistrationFormsService } from './event-registration-forms.service';

@Controller('events/:id/registration-form')
export class EventRegistrationFormsController {
  constructor(private readonly service: EventRegistrationFormsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  get(@Param('id') eventId: string) {
    return this.service.get(eventId);
  }

  @Get('/public')
  getPublic(@Param('id') eventId: string) {
    return this.service.getPublic(eventId);
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  upsert(@Param('id') eventId: string, @Body() body: any, @CurrentUser() actor: { id: string }) {
    return this.service.upsert(eventId, body?.schema, actor.id);
  }
}
