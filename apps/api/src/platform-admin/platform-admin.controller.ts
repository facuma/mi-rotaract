import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlatformAdminService } from './platform-admin.service';
import { AssignClubDto, RemoveFromClubDto } from './dto/assign-club.dto';

@Controller('admin/platform')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPERADMIN)
export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  @Get('alerts')
  alerts() {
    return this.service.getAlerts();
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('hasClub') hasClub?: string,
    @Query('role') role?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listUsers({
      search,
      hasClub: hasClub === 'true' ? true : hasClub === 'false' ? false : undefined,
      role,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  @Post('users/:id/assign-club')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assignClub(@Param('id') id: string, @Body() dto: AssignClubDto, @CurrentUser() user: { id: string }) {
    return this.service.assignClub(id, dto, user.id);
  }

  @Post('users/:id/remove-from-club')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  removeFromClub(@Param('id') id: string, @Body() dto: RemoveFromClubDto, @CurrentUser() user: { id: string }) {
    return this.service.removeFromClub(id, dto, user.id);
  }

  @Post('users/:id/reset-password')
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  resetPassword(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.resetPassword(id, user.id);
  }

  @Post('users/:id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.deactivate(id, user.id);
  }

  @Post('users/:id/reactivate')
  reactivate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.reactivate(id, user.id);
  }
}
