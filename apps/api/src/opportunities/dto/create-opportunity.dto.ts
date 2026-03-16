import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { OpportunityModality, OpportunityType } from '@prisma/client';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(1, { message: 'El título es obligatorio' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsEnum(OpportunityType)
  type: OpportunityType;

  @IsEnum(OpportunityModality)
  modality: OpportunityModality;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsUrl()
  externalUrl?: string;

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;
}
