import { IsEnum } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}
