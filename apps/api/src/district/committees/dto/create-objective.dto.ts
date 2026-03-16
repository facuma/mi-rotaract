import { IsOptional, IsString, IsInt, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommitteeObjectiveDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
