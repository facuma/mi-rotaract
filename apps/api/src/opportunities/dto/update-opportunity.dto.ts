import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { OpportunityModality, OpportunityType } from '@prisma/client';

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsEnum(OpportunityModality)
  modality?: OpportunityModality;

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
