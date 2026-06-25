import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class InstallmentInputDto {
  @IsInt()
  @Min(1)
  @Max(3)
  order: number;

  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  dueDate: string;
}

export class UpsertInstallmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => InstallmentInputDto)
  installments: InstallmentInputDto[];
}
