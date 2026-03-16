import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DistrictGuard } from '../district.guard';
import { ReportsService } from './reports.service';
import { QueryReportsDto } from './dto/query-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('district/reports')
@UseGuards(AuthGuard('jwt'), DistrictGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() query: QueryReportsDto) {
    return this.reportsService.findAll(query);
  }

  @Get('missing')
  findMissing(@Query('periodId') periodId: string, @Query('type') type?: string) {
    return this.reportsService.findMissing(periodId, type as import('@prisma/client').ReportType | undefined);
  }

  @Get('summary')
  getSummary(@Query('periodId') periodId: string, @Query('type') type?: string) {
    return this.reportsService.getSummary(periodId, type as import('@prisma/client').ReportType | undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.reportsService.update(id, dto, req.user.sub);
  }
}
