import { IsString, IsDateString, MaxLength } from 'class-validator';

export class AddProgressDto {
  @IsString()
  @MaxLength(2000)
  description: string;

  @IsDateString()
  progressDate: string;
}
