import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventMealsService } from './event-meals.service';
import { EventMealsController } from './event-meals.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EventMealsController],
  providers: [EventMealsService],
  exports: [EventMealsService],
})
export class EventMealsModule {}
