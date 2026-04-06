import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('bulk/template')
  @Roles(Role.SECRETARY)
  getBulkTemplate(@Res({ passthrough: false }) res: Response) {
    const { buffer, filename } = this.usersService.getBulkTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('bulk')
  @Roles(Role.SECRETARY)
  @HttpCode(207)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('mode') mode?: 'partial' | 'strict',
  ) {
    return this.usersService.bulkImport(file, user.id, mode);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
