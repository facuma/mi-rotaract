import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { VotingModule } from '../voting/voting.module';
import { MotionsController } from './motions.controller';
import { MotionsService } from './motions.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    VotingModule,
    forwardRef(() => RealtimeModule),
  ],
  controllers: [MotionsController],
  providers: [MotionsService],
  exports: [MotionsService],
})
export class MotionsModule {}
