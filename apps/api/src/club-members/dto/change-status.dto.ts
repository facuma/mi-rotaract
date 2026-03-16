import { IsEnum } from 'class-validator';
import { MemberStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(MemberStatus)
  status: MemberStatus;
}
