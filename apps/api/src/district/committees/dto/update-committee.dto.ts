import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { CommitteeStatus } from '@prisma/client';

export class UpdateCommitteeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @IsOptional()
  @IsEnum(CommitteeStatus)
  status?: CommitteeStatus;

  @IsOptional()
  @IsString()
  districtPeriodId?: string;
}
