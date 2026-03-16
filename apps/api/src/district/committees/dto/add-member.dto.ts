import { IsOptional, IsString } from 'class-validator';

export class AddCommitteeMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  role?: string;
}
