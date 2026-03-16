import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

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
}
