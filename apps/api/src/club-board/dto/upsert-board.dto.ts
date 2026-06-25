import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClubRole } from '@prisma/client';

export class BoardPositionInputDto {
  @IsString()
  @Length(1, 64)
  memberId: string;

  @IsEnum(ClubRole)
  role: ClubRole;
}

export class UpsertBoardDto {
  @IsOptional()
  @IsString()
  periodId?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => BoardPositionInputDto)
  positions: BoardPositionInputDto[];
}
