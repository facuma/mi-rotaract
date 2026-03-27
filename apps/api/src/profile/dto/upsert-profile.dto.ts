import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  profession?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsUrl()
  linkedInUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  experienceJson?: string;

  @IsOptional()
  @IsString()
  educationJson?: string;

  @IsOptional()
  @IsString()
  languagesJson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  availability?: string;

  @IsOptional()
  @IsBoolean()
  contactEmailPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  talentVisible?: boolean;
}
