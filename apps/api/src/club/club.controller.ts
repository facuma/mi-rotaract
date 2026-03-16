import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from './guards/club-member.guard';
import { ClubPresidentGuard } from './guards/club-president.guard';
import { ClubService } from './club.service';
import { UpdateClubMeDto } from './dto/update-club-me.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('club')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get('periods')
  @UseGuards(AuthGuard('jwt'), ClubMemberGuard)
  getPeriods() {
    return this.clubService.getPeriods();
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), ClubMemberGuard)
  getMe(@Req() req: { clubId: string }) {
    return this.clubService.getMyClub(req.clubId);
  }

  @Get('me/summary')
  @UseGuards(AuthGuard('jwt'), ClubMemberGuard)
  getSummary(@Req() req: { clubId: string }) {
    return this.clubService.getSummary(req.clubId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'), ClubMemberGuard, ClubPresidentGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateClubMeDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubService.updateMyClub(req.clubId, dto, user.id);
  }
}
