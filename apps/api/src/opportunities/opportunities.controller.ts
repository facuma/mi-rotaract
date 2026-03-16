import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { OpportunitiesService } from './opportunities.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { PublishOpportunityGuard } from './guards/publish-opportunity.guard';
import { OwnerOrDistritalGuard } from './guards/owner-or-distrital.guard';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() query: QueryOpportunitiesDto) {
    return this.opportunitiesService.findAll(query);
  }

  @Get('bulk/template')
  @UseGuards(AuthGuard('jwt'), PublishOpportunityGuard)
  getBulkTemplate(@Res({ passthrough: false }) res: import('express').Response) {
    const { buffer, filename } = this.opportunitiesService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @HttpCode(207)
  @UseGuards(AuthGuard('jwt'), PublishOpportunityGuard)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.opportunitiesService.bulkImport(file, user.id, mode);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PublishOpportunityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.opportunitiesService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), OwnerOrDistritalGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.opportunitiesService.update(id, dto, user.id);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'), PublishOpportunityGuard, OwnerOrDistritalGuard)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.opportunitiesService.publish(id, user.id);
  }

  @Patch(':id/archive')
  @UseGuards(AuthGuard('jwt'), OwnerOrDistritalGuard)
  archive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.opportunitiesService.archive(id, user.id);
  }
}
