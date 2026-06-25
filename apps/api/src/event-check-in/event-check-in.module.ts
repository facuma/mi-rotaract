import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { EventCheckInService } from './event-check-in.service';
import { EventCheckInController } from './event-check-in.controller';
import { CheckInGateway } from './event-check-in.gateway';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-in-production',
    }),
  ],
  controllers: [EventCheckInController],
  providers: [EventCheckInService, CheckInGateway],
  exports: [EventCheckInService],
})
export class EventCheckInModule {}
