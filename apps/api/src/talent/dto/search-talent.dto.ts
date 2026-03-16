import { IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchTalentDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}
