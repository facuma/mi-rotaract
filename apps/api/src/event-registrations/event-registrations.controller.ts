import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistrationsBulkImporterFactory } from './event-registrations.bulk-importer';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { QueryRegistrationsDto } from './dto/query-registrations.dto';

@Controller('events/:id/registrations')
export class EventRegistrationsController {
  constructor(
    private readonly service: EventRegistrationsService,
    private readonly bulkFactory: EventRegistrationsBulkImporterFactory,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  register(@Param('id') eventId: string, @Body() dto: CreateRegistrationDto, @CurrentUser() user: any) {
    return this.service.register(eventId, dto, user);
  }

  @Post('/rsvp')
  @UseGuards(AuthGuard('jwt'))
  rsvp(@Param('id') eventId: string, @CurrentUser() user: any) {
    return this.service.rsvp(eventId, user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  list(@Param('id') eventId: string, @Query() query: QueryRegistrationsDto) {
    return this.service.list(eventId, query);
  }

  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  me(@Param('id') eventId: string, @CurrentUser() user: any) {
    return this.service.getMyRegistration(eventId, user);
  }

  @Get('/export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  async export(@Param('id') eventId: string, @Query('format') format: string, @Res({ passthrough: false }) res: Response) {
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const { buffer, filename, contentType } = await this.service.export(eventId, fmt);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Delete(':regId')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Param('id') eventId: string, @Param('regId') regId: string, @CurrentUser() user: any) {
    return this.service.cancel(eventId, regId, user);
  }

  @Post('/bulk')
  @HttpCode(207)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  @UseInterceptors(FileInterceptor('file'))
  async bulk(@Param('id') eventId: string, @UploadedFile() file: any, @Query('mode') mode: string) {
    if (!file?.buffer) throw new BadRequestException('Archivo CSV requerido');
    const importer = this.bulkFactory.forEvent(eventId);
    return importer.import(file.buffer, (mode as any) ?? 'partial');
  }
}
