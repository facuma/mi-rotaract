import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ProfileService } from './profile.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly attachments: AttachmentsService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.profileService.getMyProfile(user.id);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  upsertProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpsertProfileDto,
  ) {
    return this.profileService.upsertProfile(user.id, dto);
  }

  @Patch('me/visibility')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateVisibility(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.profileService.updateVisibility(user.id, dto);
  }

  @Post('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadMyAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Archivo requerido');
    }
    return this.profileService.uploadAvatar(user.id, file);
  }

  @Get('avatar/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getAvatar(
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: { user: { id: string; role?: string } },
    @Res() res: Response,
  ) {
    const { stream, contentType } = await this.attachments.getAvatarStream(
      userId,
      req.user.id,
      (req.user.role as Role) ?? undefined,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    stream.pipe(res);
  }
}
