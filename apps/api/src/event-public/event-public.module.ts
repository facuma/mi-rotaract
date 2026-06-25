import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventPublicController } from './event-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EventPublicController],
})
export class EventPublicModule {}
