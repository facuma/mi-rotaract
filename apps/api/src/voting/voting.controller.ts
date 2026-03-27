import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MeetingsService } from '../meetings/meetings.service';
import { VotingService } from './voting.service';

@Controller('meetings/:meetingId')
@UseGuards(AuthGuard('jwt'))
export class VotingController {
  constructor(
    private readonly votingService: VotingService,
    private readonly meetingsService: MeetingsService,
  ) {}

  @Post('vote/open')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  open(
    @Param('meetingId') meetingId: string,
    @Body('topicId') topicId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.votingService.openVote(meetingId, topicId, user.id);
  }

  @Post('vote/close')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  close(
    @Param('meetingId') meetingId: string,
    @Body('voteSessionId') voteSessionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.votingService.closeVote(meetingId, voteSessionId, user.id);
  }

  @Post('vote')
  submit(
    @Param('meetingId') meetingId: string,
    @Body('voteSessionId') voteSessionId: string,
    @Body('choice') choice: 'YES' | 'NO' | 'ABSTAIN',
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.votingService.submitVote(meetingId, voteSessionId, user.id, choice);
  }

  @Get('vote/current')
  getCurrent(@Param('meetingId') meetingId: string) {
    return this.votingService.getOpenSession(meetingId);
  }

  @Get('vote/:voteSessionId/result')
  getResult(
    @Param('meetingId') meetingId: string,
    @Param('voteSessionId') voteSessionId: string,
  ) {
    return this.votingService.getResult(voteSessionId);
  }

  @Get('vote/:voteSessionId/detailed')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  getDetailed(
    @Param('meetingId') meetingId: string,
    @Param('voteSessionId') voteSessionId: string,
  ) {
    return this.votingService.getDetailedResult(voteSessionId);
  }
}
