import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VotingModule } from '../voting/voting.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-in-production',
      signOptions: { expiresIn: '7d' },
    }),
    forwardRef(() => VotingModule),
    forwardRef(() => MeetingsModule),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
