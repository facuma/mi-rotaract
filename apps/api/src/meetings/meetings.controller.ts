import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Delete,
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
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignParticipantsDto } from './dto/assign-participants.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';
import { AttachmentsService } from '../attachments/attachments.service';

@Controller('meetings')
@UseGuards(AuthGuard('jwt'))
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.findAll(user.id, user.role as Role);
  }

  @Get('bulk/template')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY)
  getBulkTemplate(@Res({ passthrough: false }) res: import('express').Response) {
    const { buffer, filename } = this.meetingsService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @HttpCode(207)
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.meetingsService.bulkImport(file, user.id, mode);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.findOne(id, user.id, user.role as Role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.meetingsService.update(id, dto, user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  start(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.start(id, user.id);
  }

  @Post(':id/pause')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  pause(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.pause(id, user.id);
  }

  @Post(':id/resume')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  resume(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.resume(id, user.id);
  }

  @Post(':id/finish')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  finish(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.finish(id, user.id);
  }

  @Post(':id/schedule')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  schedule(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.schedule(id, user.id);
  }

  @Get(':id/participants/bulk/template')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY)
  async getParticipantsBulkTemplate(
    @Param('id') id: string,
    @Res({ passthrough: false }) res: import('express').Response,
  ) {
    const { buffer, filename } =
      await this.meetingsService.getParticipantsBulkTemplate(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/participants/bulk')
  @HttpCode(207)
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImportParticipants(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.meetingsService.bulkImportParticipants(id, file, user.id, mode);
  }

  @Post(':id/participants')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  assignParticipants(
    @Param('id') id: string,
    @Body() dto: AssignParticipantsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.meetingsService.assignParticipants(id, dto, user.id);
  }

  @Get(':id/attachments')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  listAttachments(@Param('id') id: string) {
    return this.attachmentsService.list('meeting', id);
  }

  @Post(':id/attachments')
  @UseGuards(RolesGuard)
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
    return this.attachmentsService.upload('meeting', id, file, user.id, {
      clubId: req.clubId,
      role: user.role as Role,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT)
  deleteAttachment(
    @Param('id') meetingId: string,
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
