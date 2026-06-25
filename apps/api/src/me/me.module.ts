import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ActiveClubController } from './active-club.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ActiveClubController],
})
export class MeModule {}
