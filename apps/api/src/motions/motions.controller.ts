import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MajorityType, Role, VotingMethod } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MotionsService } from './motions.service';

@Controller('meetings/:meetingId/motions')
@UseGuards(AuthGuard('jwt'))
export class MotionsController {
  constructor(private readonly motionsService: MotionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.RDR)
  propose(
    @Param('meetingId') meetingId: string,
    @Body('title') title: string,
    @Body('description') description: string | undefined,
    @Body('clubId') clubId: string,
    @Body('secondedByClubId') secondedByClubId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.motionsService.propose(meetingId, user.id, title, description, clubId, secondedByClubId);
  }

  @Post(':motionId/second')
  second(
    @Param('meetingId') meetingId: string,
    @Param('motionId') motionId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.motionsService.second(meetingId, motionId, user.id);
  }

  @Post(':motionId/launch-vote')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.RDR)
  launchVote(
    @Param('meetingId') meetingId: string,
    @Param('motionId') motionId: string,
    @Body('votingMethod') votingMethod: VotingMethod,
    @Body('requiredMajority') requiredMajority: MajorityType,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.motionsService.launchVote(meetingId, motionId, user.id, {
      votingMethod,
      requiredMajority,
    });
  }
}
