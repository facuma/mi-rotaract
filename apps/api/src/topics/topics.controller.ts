import {
  Body,
  Controller,
  Delete,
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
import { MeetingsService } from '../meetings/meetings.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReorderTopicsDto } from './dto/reorder-topics.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { TopicsService } from './topics.service';

@Controller('meetings/:meetingId/topics')
@UseGuards(AuthGuard('jwt'))
export class TopicsController {
  constructor(
    private readonly topicsService: TopicsService,
    private readonly meetingsService: MeetingsService,
  ) {}

  @Get()
  async findAll(
    @Param('meetingId') meetingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.meetingsService.findOne(meetingId, user.id, user.role as Role);
    return this.topicsService.findAll(meetingId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateTopicDto,
  ) {
    return this.topicsService.create(meetingId, dto);
  }

  @Patch(':topicId')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('meetingId') meetingId: string,
    @Param('topicId') topicId: string,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.topicsService.update(meetingId, topicId, dto);
  }

  @Delete(':topicId')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  remove(
    @Param('meetingId') meetingId: string,
    @Param('topicId') topicId: string,
  ) {
    return this.topicsService.remove(meetingId, topicId);
  }

  @Post('reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  reorder(
    @Param('meetingId') meetingId: string,
    @Body() dto: ReorderTopicsDto,
  ) {
    return this.topicsService.reorder(meetingId, dto);
  }

  @Post('current')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  setCurrent(
    @Param('meetingId') meetingId: string,
    @Body('topicId') topicId: string | null,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.topicsService.setCurrentTopic(meetingId, topicId || null, user.id);
  }
}
