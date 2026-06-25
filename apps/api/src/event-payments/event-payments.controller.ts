import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EventPaymentsService } from './event-payments.service';
import { UpsertTicketDto } from './dto/upsert-ticket.dto';
import { UpsertInstallmentsDto } from './dto/upsert-installments.dto';
import { RecordPaymentDto, WaivePaymentDto } from './dto/record-payment.dto';

@Controller('events/:id')
export class EventPaymentsController {
  constructor(private readonly service: EventPaymentsService) {}

  @Get('ticket')
  @UseGuards(AuthGuard('jwt'))
  getTicket(@Param('id') eventId: string) {
    return this.service.getTicket(eventId);
  }

  @Put('ticket')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertTicket(@Param('id') eventId: string, @Body() dto: UpsertTicketDto, @CurrentUser() actor: any) {
    return this.service.upsertTicket(eventId, dto, actor.id);
  }

  @Get('installments')
  @UseGuards(AuthGuard('jwt'))
  listInstallments(@Param('id') eventId: string) {
    return this.service.listInstallments(eventId);
  }

  @Put('installments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertInstallments(
    @Param('id') eventId: string,
    @Body() dto: UpsertInstallmentsDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.upsertInstallments(eventId, dto, actor.id);
  }

  @Get('payments')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  listPayments(@Param('id') eventId: string) {
    return this.service.listPayments(eventId);
  }

  @Get('payments/summary')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  getSummary(@Param('id') eventId: string) {
    return this.service.getPaymentSummary(eventId);
  }

  @Post('registrations/:regId/payments/:installmentId/record')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY, Role.PRESIDENT, Role.RDR)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  record(
    @Param('id') eventId: string,
    @Param('regId') regId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.recordPayment(eventId, regId, installmentId, dto, actor.id);
  }

  @Post('registrations/:regId/payments/:installmentId/waive')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SECRETARY)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  waive(
    @Param('id') eventId: string,
    @Param('regId') regId: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: WaivePaymentDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.waivePayment(eventId, regId, installmentId, dto, actor.id);
  }
}
