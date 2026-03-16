import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubAuthorityGuard } from '../club/guards/club-authority.guard';
import { ClubPresidentGuard } from '../club/guards/club-president.guard';
import { ClubReportsService } from './club-reports.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CreateClubReportDto } from './dto/create-club-report.dto';
import { UpdateClubReportDto } from './dto/update-club-report.dto';
import { QueryClubReportsDto } from './dto/query-club-reports.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('club/reports')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class ClubReportsController {
  constructor(
    private readonly clubReportsService: ClubReportsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get()
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(
    @Req() req: { clubId: string },
    @Query() query: QueryClubReportsDto,
  ) {
    return this.clubReportsService.findAll(req.clubId, query);
  }

  @Get(':id')
  @UseGuards(ClubAuthorityGuard)
  findOne(@Param('id') id: string, @Req() req: { clubId: string }) {
    return this.clubReportsService.findOne(id, req.clubId);
  }

  @Post()
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateClubReportDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubReportsService.create(req.clubId, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClubReportDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubReportsService.update(id, req.clubId, dto);
  }

  @Post(':id/submit')
  @UseGuards(ClubPresidentGuard)
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: { clubId: string },
  ) {
    return this.clubReportsService.submit(id, req.clubId, user.id);
  }

  @Get(':id/attachments')
  @UseGuards(ClubAuthorityGuard)
  listAttachments(@Param('id') id: string, @Req() req: { clubId: string }) {
    return this.attachmentsService.list('report', id);
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
    return this.attachmentsService.upload('report', id, file, req.user.id, {
      clubId: req.clubId,
    });
  }

  @Delete(':id/attachments/:attachmentId')
  @UseGuards(ClubAuthorityGuard)
  deleteAttachment(
    @Param('id') reportId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: { clubId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attachmentsService.delete(attachmentId, {
      clubId: req.clubId,
      actorUserId: user.id,
    });
  }

  @Post(':id/resubmit')
  @UseGuards(ClubPresidentGuard)
  resubmit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: { clubId: string },
  ) {
    return this.clubReportsService.resubmit(id, req.clubId, user.id);
  }
}
