import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventPermissionScope, EventPermissionStatus } from '@prisma/client';

export class QueryPermissionsDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsEnum(EventPermissionStatus)
  status?: EventPermissionStatus;

  @IsOptional()
  @IsEnum(EventPermissionScope)
  scope?: EventPermissionScope;
}
