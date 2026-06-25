import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClubMemberGuard } from '../club/guards/club-member.guard';
import { ClubAuthorityGuard } from '../club/guards/club-authority.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TransferRequestsService } from './transfer-requests.service';
import { CreateTransferRequestDto } from './dto/create-transfer.dto';

@Controller('club/transfer-requests')
@UseGuards(AuthGuard('jwt'), ClubMemberGuard)
export class TransferRequestsController {
  constructor(private readonly service: TransferRequestsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.clubId);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Req() req: any, @Body() dto: CreateTransferRequestDto, @CurrentUser() user: { id: string }) {
    return this.service.create(user.id, req.clubId, dto);
  }

  @Patch(':id/accept')
  @UseGuards(ClubAuthorityGuard)
  accept(@Req() req: any, @Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.accept(id, req.clubId, user.id);
  }

  @Patch(':id/confirm')
  @UseGuards(ClubAuthorityGuard)
  confirm(@Req() req: any, @Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.confirm(id, req.clubId, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(ClubAuthorityGuard)
  reject(@Req() req: any, @Param('id') id: string, @CurrentUser() user: { id: string }, @Body('reason') reason?: string) {
    return this.service.reject(id, req.clubId, user.id, reason);
  }
}
