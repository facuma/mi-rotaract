import { IsEmail, IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateRegistrationDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(2, 120)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}
