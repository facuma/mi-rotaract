import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ScanMealDto {
  @IsString()
  @MaxLength(500)
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceInfo?: string;
}
