import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptNote?: string;
}

export class WaivePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
