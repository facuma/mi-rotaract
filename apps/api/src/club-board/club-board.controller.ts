import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubPresidentGuard } from '../club/guards/club-president.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClubBoardService } from './club-board.service';
import { UpsertBoardDto } from './dto/upsert-board.dto';

@Controller('club/board')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class ClubBoardController {
  constructor(private readonly service: ClubBoardService) {}

  @Get()
  list(@Req() req: any, @Query('periodId') periodId?: string) {
    return this.service.list(req.clubId, periodId);
  }

  @Post()
  @UseGuards(ClubPresidentGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  upsert(@Req() req: any, @Body() dto: UpsertBoardDto, @CurrentUser() user: { id: string }) {
    return this.service.upsert(req.clubId, dto, user.id);
  }
}
