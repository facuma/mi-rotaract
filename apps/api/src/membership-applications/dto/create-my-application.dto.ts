import { IsOptional, IsString, Length } from 'class-validator';

export class CreateMyApplicationDto {
  @IsString()
  @Length(1, 100)
  clubId: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  message?: string;
}
