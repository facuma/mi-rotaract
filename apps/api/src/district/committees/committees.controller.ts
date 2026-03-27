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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { CommitteeStatus } from '@prisma/client';
import { DistrictGuard } from '../district.guard';
import { CommitteesService } from './committees.service';
import { CreateCommitteeDto } from './dto/create-committee.dto';
import { UpdateCommitteeDto } from './dto/update-committee.dto';
import { AddCommitteeMemberDto } from './dto/add-member.dto';
import { CreateCommitteeObjectiveDto } from './dto/create-objective.dto';
import { UpdateCommitteeObjectiveDto } from './dto/update-objective.dto';
import { CreateCommitteeActivityDto } from './dto/create-activity.dto';
import { UpdateCommitteeActivityDto } from './dto/update-activity.dto';
import { AttachmentsService } from '../../attachments/attachments.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('district/committees')
@UseGuards(AuthGuard('jwt'), DistrictGuard)
export class CommitteesController {
  constructor(
    private readonly committeesService: CommitteesService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  findAll(
    @Query('status') status?: CommitteeStatus,
    @Query('coordinatorId') coordinatorId?: string,
  ) {
    return this.committeesService.findAll(status, coordinatorId);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateCommitteeDto) {
    return this.committeesService.create(dto);
  }

  @Get(':id/objectives')
  listObjectives(@Param('id') id: string) {
    return this.committeesService.findOne(id).then((c) => c.objectives);
  }

  @Post(':id/objectives')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createObjective(
    @Param('id') id: string,
    @Body() dto: CreateCommitteeObjectiveDto,
  ) {
    return this.committeesService.createObjective(id, dto);
  }

  @Patch(':id/objectives/:objectiveId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateObjective(
    @Param('id') id: string,
    @Param('objectiveId') objectiveId: string,
    @Body() dto: UpdateCommitteeObjectiveDto,
  ) {
    return this.committeesService.updateObjective(id, objectiveId, dto);
  }

  @Delete(':id/objectives/:objectiveId')
  removeObjective(
    @Param('id') id: string,
    @Param('objectiveId') objectiveId: string,
  ) {
    return this.committeesService.removeObjective(id, objectiveId);
  }

  @Get(':id/activities')
  listActivities(@Param('id') id: string) {
    return this.committeesService.findOne(id).then((c) => c.activities);
  }

  @Post(':id/activities')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createActivity(
    @Param('id') id: string,
    @Body() dto: CreateCommitteeActivityDto,
  ) {
    return this.committeesService.createActivity(id, dto);
  }

  @Patch(':id/activities/:activityId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateCommitteeActivityDto,
  ) {
    return this.committeesService.updateActivity(id, activityId, dto);
  }

  @Delete(':id/activities/:activityId')
  removeActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
  ) {
    return this.committeesService.removeActivity(id, activityId);
  }

  @Get(':id/activities/:activityId/attachments')
  listActivityAttachments(@Param('activityId') activityId: string) {
    return this.attachmentsService.list('committee_activity', activityId);
  }

  @Post(':id/activities/:activityId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async uploadActivityAttachment(
    @Param('activityId') activityId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo "file")');
    }
    return this.attachmentsService.upload(
      'committee_activity',
      activityId,
      file,
      user.id,
      { role: user.role as Role },
    );
  }

  @Delete(':id/activities/:activityId/attachments/:attachmentId')
  deleteActivityAttachment(
    @Param('activityId') activityId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attachmentsService.delete(attachmentId, {
      role: user.role as Role,
      actorUserId: user.id,
    });
  }

  @Get(':id/members/bulk/template')
  async getMembersBulkTemplate(
    @Param('id') id: string,
    @Res({ passthrough: false }) res: import('express').Response,
  ) {
    const { buffer, filename } =
      await this.committeesService.getMembersBulkTemplate(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/members/bulk')
  @HttpCode(207)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImportMembers(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.committeesService.bulkImportMembers(id, file, mode);
  }

  @Post(':id/members')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addMember(@Param('id') id: string, @Body() dto: AddCommitteeMemberDto) {
    return this.committeesService.addMember(id, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.committeesService.removeMember(id, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.committeesService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() dto: UpdateCommitteeDto) {
    return this.committeesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.committeesService.remove(id);
  }
}
