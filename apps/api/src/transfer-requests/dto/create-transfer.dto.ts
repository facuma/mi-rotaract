import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTransferRequestDto {
  @IsString()
  @Length(1, 64)
  toClubId: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  reason?: string;
}
