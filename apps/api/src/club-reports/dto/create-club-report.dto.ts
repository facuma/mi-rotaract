import { IsString, IsEnum } from 'class-validator';
import { ReportType } from '@prisma/client';

export class CreateClubReportDto {
  @IsString()
  districtPeriodId: string;

  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  contentJson: string;
}
