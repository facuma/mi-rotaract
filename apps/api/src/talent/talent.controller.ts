import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TalentService } from './talent.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { SearchTalentDto } from './dto/search-talent.dto';

@Controller('talent')
export class TalentController {
  constructor(private readonly talentService: TalentService) {}

  /**
   * Feed público/anónimo de talento para visitantes externos.
   * No requiere autenticación y nunca expone datos de contacto.
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  searchPublic(@Query() query: SearchTalentDto) {
    return this.talentService.searchPublic(query);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() query: SearchTalentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.talentService.search(query, user);
  }

  @Get(':userId')
  @UseGuards(AuthGuard('jwt'))
  getPublicCard(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.talentService.getPublicCard(userId, user);
  }
}
