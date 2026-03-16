import { IsOptional, IsString } from 'class-validator';

export class UpdateClubReportDto {
  @IsOptional()
  @IsString()
  contentJson?: string;

  @IsOptional()
  @IsString()
  responseToObservations?: string;
}
