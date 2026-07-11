import { IsString, MaxLength } from 'class-validator';

export class CreateTranscriptionDto {
  @IsString()
  @MaxLength(10000)
  text: string;
}
