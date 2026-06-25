import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertTicketDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @IsIn(['ARS', 'USD', 'UYU', 'CLP', 'BRL'])
  currency?: string;
}
