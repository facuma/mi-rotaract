import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { CommitteeStatus } from '@prisma/client';

export class CreateCommitteeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  coordinatorId: string;

  @IsOptional()
  @IsEnum(CommitteeStatus)
  status?: CommitteeStatus;

  @IsOptional()
  @IsString()
  districtPeriodId?: string;
}
