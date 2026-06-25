import {
  Body,
  Controller,
  Delete,
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
import { EventMealsService } from './event-meals.service';
import { UpsertMealDto } from './dto/upsert-meal.dto';
import { ScanMealDto } from './dto/scan-meal.dto';

@Controller('events/:id/meals')
export class EventMealsController {
  constructor(private readonly service: EventMealsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@Param('id') eventId: string) {
    return this.service.list(eventId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Param('id') eventId: string, @Body() dto: UpsertMealDto, @CurrentUser() actor: any) {
    return this.service.create(eventId, dto, actor.id);
  }

  @Put(':mealId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id') eventId: string,
    @Param('mealId') mealId: string,
    @Body() dto: UpsertMealDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.update(eventId, mealId, dto, actor.id);
  }

  @Delete(':mealId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  remove(@Param('id') eventId: string, @Param('mealId') mealId: string, @CurrentUser() actor: any) {
    return this.service.remove(eventId, mealId, actor.id);
  }

  @Post(':mealId/scan')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  scan(
    @Param('id') eventId: string,
    @Param('mealId') mealId: string,
    @Body() dto: ScanMealDto,
    @CurrentUser() actor: any,
  ) {
    return this.service.scan(eventId, mealId, dto.token, actor, dto.deviceInfo);
  }

  @Get(':mealId/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  stats(@Param('id') eventId: string, @Param('mealId') mealId: string) {
    return this.service.stats(eventId, mealId);
  }

  @Get('/all/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  statsAll(@Param('id') eventId: string) {
    return this.service.statsPerMeal(eventId);
  }
}
