import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DistrictGuard } from '../district.guard';
import { ClubsService } from '../../clubs/clubs.service';
import { DistrictClubsService } from './district-clubs.service';
import { UpdateClubDto } from '../../clubs/dto/update-club.dto';

@Controller('district/clubs')
@UseGuards(AuthGuard('jwt'), DistrictGuard)
export class DistrictClubsController {
  constructor(
    private readonly districtClubsService: DistrictClubsService,
    private readonly clubsService: ClubsService,
  ) {}

  @Get()
  findAll(
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('search') search?: string,
    @Query('informeAlDia') informeAlDia?: string,
    @Query('enabledForDistrictMeetings') enabledForDistrictMeetings?: string,
  ) {
    return this.districtClubsService.findAll({
      status,
      search,
      informeAlDia: informeAlDia === 'true' ? true : informeAlDia === 'false' ? false : undefined,
      enabledForDistrictMeetings:
        enabledForDistrictMeetings === 'true'
          ? true
          : enabledForDistrictMeetings === 'false'
            ? false
            : undefined,
    });
  }

  @Get(':id/reports')
  findClubReports(@Param('id') id: string, @Query('periodId') periodId?: string) {
    return this.districtClubsService.findClubReports(id, periodId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.districtClubsService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsService.update(id, dto);
  }
}
