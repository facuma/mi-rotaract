import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubAuthorityGuard } from '../club/guards/club-authority.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MembershipApplicationsService } from './membership-applications.service';
import { CreateMyApplicationDto } from './dto/create-my-application.dto';

@Controller('me/membership-applications')
@UseGuards(AuthGuard('jwt'))
export class MyMembershipApplicationsController {
  constructor(private readonly service: MembershipApplicationsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateMyApplicationDto) {
    return this.service.createForUser(user.id, dto);
  }

  @Get('current')
  current(@CurrentUser() user: { id: string }) {
    return this.service.getCurrentForUser(user.id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.cancelForUser(user.id, id);
  }
}

@Controller('club/membership-applications')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard, ClubAuthorityGuard)
export class PrivateMembershipApplicationsController {
  constructor(private readonly service: MembershipApplicationsService) {}

  @Get()
  list(@Req() req: any, @Query('status') status?: string) {
    return this.service.list(req.clubId, status);
  }

  @Patch(':id/approve')
  approve(@Req() req: any, @Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.approve(id, req.clubId, user.id);
  }

  @Patch(':id/reject')
  reject(
    @Req() req: any,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body('reason') reason?: string,
  ) {
    return this.service.reject(id, req.clubId, user.id, reason);
  }
}
