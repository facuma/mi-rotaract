import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubAuthorityGuard } from '../club/guards/club-authority.guard';
import { ClubProjectsService } from './club-projects.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddProgressDto } from './dto/add-progress.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { ProjectStatus } from '@prisma/client';

@Controller('club/projects')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class ClubProjectsController {
  constructor(
    private readonly clubProjectsService: ClubProjectsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  @UseGuards(ClubAuthorityGuard)
  findAll(
    @Req() req: { clubId: string },
    @Query('status') status?: ProjectStatus,
  ) {
    return this.clubProjectsService.findAll(req.clubId, status);
  }

  @Get('bulk/template')
  @UseGuards(ClubAuthorityGuard)
  getBulkTemplate(
    @Req() req: { clubId: string },
    @Res({ passthrough: false }) res: import('express').Response,
  ) {
    const { buffer, filename } = this.clubProjectsService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @HttpCode(207)
  @UseGuards(ClubAuthorityGuard)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: { clubId: string },
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.clubProjectsService.bulkImport(req.clubId, file, user.id, mode);
  }

  @Get(':id')
  @UseGuards(ClubAuthorityGuard)
  findOne(@Param('id') id: string, @Req() req: { clubId: string }) {
    return this.clubProjectsService.findOne(id, req.clubId);
  }

  @Post()
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateProjectDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubProjectsService.create(req.clubId, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubProjectsService.update(id, req.clubId, dto);
  }

  @Patch(':id/status')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubProjectsService.updateStatus(
      id,
      req.clubId,
      dto.status,
      user.id,
    );
  }

  @Post(':id/progress')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  addProgress(
    @Param('id') id: string,
    @Body() dto: AddProgressDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubProjectsService.addProgress(id, req.clubId, dto);
  }

  @Get(':id/attachments')
  @UseGuards(ClubAuthorityGuard)
  listAttachments(@Param('id') id: string) {
    return this.attachmentsService.list('project', id);
  }

  @Post(':id/attachments')
  @UseGuards(ClubAuthorityGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @Req() req: { clubId: string; user: { id: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo "file")');
    }
    return this.attachmentsService.upload('project', id, file, req.user.id, {
      clubId: req.clubId,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(ClubAuthorityGuard)
  deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Req() req: { clubId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attachmentsService.delete(attachmentId, {
      clubId: req.clubId,
      actorUserId: user.id,
    });
  }
}
