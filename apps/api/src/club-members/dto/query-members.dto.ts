import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { MemberStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class QueryMembersDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;

  @IsOptional()
  @Transform(({ value }) => Math.max(1, parseInt(value, 10) || 1))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Math.min(100, Math.max(1, parseInt(value, 10) || 20)))
  limit?: number = 20;
}
