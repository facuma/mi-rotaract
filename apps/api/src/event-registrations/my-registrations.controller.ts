import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventRegistrationsService } from './event-registrations.service';

@Controller('me/registrations')
export class MyRegistrationsController {
  constructor(private readonly service: EventRegistrationsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@CurrentUser() user: any, @Query('scope') scope?: string) {
    return this.service.listMyRegistrations(user, (scope as any) ?? 'all');
  }
}
