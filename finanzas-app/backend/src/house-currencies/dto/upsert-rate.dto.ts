import { IsString, IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpsertRateDto {
  @IsString() @IsNotEmpty() fromCurrency: string;

  @IsString() @IsNotEmpty() toCurrency: string;

  @IsNumber() @IsPositive() rate: number;

  @IsOptional() @IsString() rateType?: string;
}
