import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
