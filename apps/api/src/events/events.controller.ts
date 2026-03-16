import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(
    @Query() query: QueryEventsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.findAll(
      query,
      user.id,
      user.role as Role,
    );
  }

  @Get('upcoming')
  @UseGuards(AuthGuard('jwt'))
  findUpcoming(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.eventsService.findUpcoming(limitNum);
  }

  @Get('past')
  @UseGuards(AuthGuard('jwt'))
  findPast(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.eventsService.findPast(pageNum, limitNum);
  }

  @Get('bulk/template')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  getBulkTemplate(@Res({ passthrough: false }) res: import('express').Response) {
    const { buffer, filename } = this.eventsService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @HttpCode(207)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.eventsService.bulkImport(file, user.id, user.role as Role, mode);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.findOne(id, user.id, user.role as Role);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.create(dto, user.id, user.role as Role);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.update(id, dto, user.id, user.role as Role);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.remove(id, user.id, user.role as Role);
  }

  @Patch(':id/publish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.publish(id, user.id, user.role as Role);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.cancel(id, user.id, user.role as Role);
  }

  @Patch(':id/finish')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  markFinished(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.markFinished(id, user.id, user.role as Role);
  }

  @Get(':id/attachments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  listAttachments(@Param('id') id: string) {
    return this.attachmentsService.list('event', id);
  }

  @Post(':id/attachments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @Req() req: { clubId?: string },
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo "file")');
    }
    return this.attachmentsService.upload('event', id, file, user.id, {
      clubId: req.clubId,
      role: user.role as Role,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  deleteAttachment(
    @Param('id') eventId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: { clubId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attachmentsService.delete(attachmentId, {
      clubId: req.clubId,
      role: user.role as Role,
      actorUserId: user.id,
    });
  }
}
