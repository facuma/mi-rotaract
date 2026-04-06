import {
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
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get('bulk/template')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  getBulkTemplate(@Res({ passthrough: false }) res: Response) {
    const { buffer, filename } = this.clubsService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @HttpCode(207)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.clubsService.bulkImport(file, user.id, mode);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR, Role.PARTICIPANT)
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.clubsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR, Role.PARTICIPANT)
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateClubDto) {
    return this.clubsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  remove(@Param('id') id: string) {
    return this.clubsService.remove(id);
  }
}
