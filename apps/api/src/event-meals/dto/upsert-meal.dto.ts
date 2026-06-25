import { IsDateString, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class UpsertMealDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsDateString()
  servedAt: string;

  @IsDateString()
  windowStart: string;

  @IsDateString()
  windowEnd: string;

  @IsInt()
  @Min(1)
  order: number;
}
