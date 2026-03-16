import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Patch,
  Delete,
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
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubAuthorityGuard } from '../club/guards/club-authority.guard';
import { ClubPresidentGuard } from '../club/guards/club-president.guard';
import { ClubMembersService } from './club-members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
@Controller('club/members')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class ClubMembersController {
  constructor(private readonly clubMembersService: ClubMembersService) {}

  @Get()
  findAll(
    @Req() req: { clubId: string },
    @Query() query: QueryMembersDto,
  ) {
    return this.clubMembersService.findAll(req.clubId, query);
  }

  @Get('incomplete-profiles')
  @UseGuards(ClubAuthorityGuard)
  getIncompleteProfiles(@Req() req: { clubId: string }) {
    return this.clubMembersService.getIncompleteProfiles(req.clubId);
  }

  @Get('bulk/template')
  @UseGuards(ClubAuthorityGuard)
  getBulkTemplate(@Req() req: { clubId: string }, @Res({ passthrough: false }) res: import('express').Response) {
    const { buffer, filename } = this.clubMembersService.getBulkTemplate();
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
    return this.clubMembersService.bulkImport(req.clubId, file, user.id, mode);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { clubId: string }) {
    return this.clubMembersService.findOne(id, req.clubId);
  }

  @Get(':id/history')
  @UseGuards(ClubAuthorityGuard)
  getHistory(@Param('id') id: string, @Req() req: { clubId: string }) {
    return this.clubMembersService.getHistory(id, req.clubId);
  }

  @Post()
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMemberDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubMembersService.create(req.clubId, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubMembersService.update(id, req.clubId, dto, user.id);
  }

  @Patch(':id/status')
  @UseGuards(ClubAuthorityGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  changeStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: { clubId: string },
  ) {
    return this.clubMembersService.changeStatus(
      id,
      req.clubId,
      dto.status,
      user.id,
    );
  }

  @Post(':id/avatar')
  @UseGuards(ClubAuthorityGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMemberAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { clubId: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Archivo requerido');
    }
    return this.clubMembersService.uploadMemberAvatar(id, req.clubId, file, user.id);
  }

  @Post(':id/president')
  @UseGuards(ClubPresidentGuard)
  assignPresident(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: { clubId: string },
  ) {
    return this.clubMembersService.assignPresident(id, req.clubId, user.id);
  }

  @Delete(':id')
  @UseGuards(ClubAuthorityGuard)
  softDelete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Req() req: { clubId: string },
  ) {
    return this.clubMembersService.softDelete(id, req.clubId, user.id);
  }
}
