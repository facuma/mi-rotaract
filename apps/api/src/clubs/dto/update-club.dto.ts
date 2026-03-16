import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ClubStatus } from '@prisma/client';

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsEmail()
  presidentEmail?: string;

  @IsOptional()
  @IsBoolean()
  enabledForDistrictMeetings?: boolean;

  @IsOptional()
  @IsBoolean()
  cuotaAldia?: boolean;

  @IsOptional()
  @IsBoolean()
  informeAlDia?: boolean;

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;
}
