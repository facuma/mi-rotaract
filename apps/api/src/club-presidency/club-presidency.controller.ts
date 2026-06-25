import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubPresidentGuard } from '../club/guards/club-president.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClubPresidencyService } from './club-presidency.service';
import { DesignateSuccessorDto } from './dto/designate-successor.dto';

@Controller('club/presidency')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class ClubPresidencyController {
  constructor(private readonly service: ClubPresidencyService) {}

  @Get('current')
  current(@Req() req: any) {
    return this.service.currentActive(req.clubId);
  }

  @Get('elect')
  elect(@Req() req: any) {
    return this.service.elect(req.clubId);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.service.history(req.clubId);
  }

  @Get('periods')
  periods() {
    return this.service.designatablePeriods();
  }

  @Post('successor')
  @UseGuards(ClubPresidentGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  designate(@Req() req: any, @Body() dto: DesignateSuccessorDto, @CurrentUser() user: { id: string }) {
    return this.service.designateSuccessor({
      clubId: req.clubId,
      memberId: dto.memberId,
      periodId: dto.periodId,
      actorUserId: user.id,
    });
  }

  @Post(':id/revoke')
  @UseGuards(ClubPresidentGuard)
  revoke(@Req() req: any, @Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.revoke({ id, clubId: req.clubId, actorUserId: user.id });
  }
}
