import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckInDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceInfo?: string;
}
