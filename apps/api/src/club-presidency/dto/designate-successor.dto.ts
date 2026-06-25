import { IsString, Length } from 'class-validator';

export class DesignateSuccessorDto {
  @IsString()
  @Length(1, 64)
  memberId: string;

  @IsString()
  @Length(1, 64)
  periodId: string;
}
