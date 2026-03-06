import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignParticipantsDto } from './dto/assign-participants.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
@UseGuards(AuthGuard('jwt'))
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.findAll(user.id, user.role as Role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.findOne(id, user.id, user.role as Role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.meetingsService.update(id, dto, user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  start(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.start(id, user.id);
  }

  @Post(':id/pause')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  pause(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.pause(id, user.id);
  }

  @Post(':id/resume')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  resume(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.resume(id, user.id);
  }

  @Post(':id/finish')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  finish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.finish(id, user.id);
  }

  @Post(':id/schedule')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  schedule(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.schedule(id, user.id);
  }

  @Post(':id/participants')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assignParticipants(
    @Param('id') id: string,
    @Body() dto: AssignParticipantsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.meetingsService.assignParticipants(id, dto, user.id);
  }
}
