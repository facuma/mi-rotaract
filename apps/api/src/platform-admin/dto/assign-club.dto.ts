import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ClubRole } from '@prisma/client';

export class AssignClubDto {
  @IsString()
  @Length(1, 100)
  clubId: string;

  @IsOptional()
  @IsEnum(ClubRole)
  clubRole?: ClubRole;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  title?: string;
}

export class RemoveFromClubDto {
  @IsString()
  @Length(1, 100)
  clubId: string;
}
