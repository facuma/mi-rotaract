import { IsOptional, IsString, IsDateString, MinLength } from 'class-validator';

export class UpdateCommitteeActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
