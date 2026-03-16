import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ReportStatus, ReportType } from '@prisma/client';

export class QueryClubReportsDto {
  @IsOptional()
  @IsString()
  periodId?: string;

  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
