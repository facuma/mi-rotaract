import { IsOptional, IsString, IsDateString, MinLength } from 'class-validator';

export class CreateCommitteeActivityDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
