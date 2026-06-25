import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventPermissionsService } from './event-permissions.service';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { QueryPermissionsDto } from './dto/query-permissions.dto';

@Controller('events/permissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EventPermissionsController {
  constructor(private readonly service: EventPermissionsService) {}

  @Post()
  @Roles(Role.DISTRICT_SECRETARY)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  grant(@Body() dto: GrantPermissionDto, @CurrentUser() user: { id: string }) {
    return this.service.grant(dto, user.id);
  }

  @Get()
  @Roles(Role.DISTRICT_SECRETARY, Role.DISTRICT_RDR)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  list(@Query() query: QueryPermissionsDto) {
    return this.service.list(query);
  }

  @Patch(':id/revoke')
  @Roles(Role.DISTRICT_SECRETARY)
  revoke(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.revoke(id, user.id);
  }
}
