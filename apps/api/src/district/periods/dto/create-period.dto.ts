import { IsDateString, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
