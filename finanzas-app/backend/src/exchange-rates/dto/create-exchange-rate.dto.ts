import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateExchangeRateDto {
  @IsString() @IsNotEmpty() fromCurrency: string;

  @IsString() @IsNotEmpty() toCurrency: string;

  @IsNumber() @Min(0) rate: number;

  @IsDateString() date: string;

  @IsOptional() @IsString() source?: string;

  @IsOptional() @IsString() rateType?: string;
}
