import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EventPermissionScope } from '@prisma/client';

export class GrantPermissionDto {
  @IsString()
  clubId: string;

  @IsEnum(EventPermissionScope)
  scope: EventPermissionScope;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
