import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertRateDto {
  @IsString() @IsNotEmpty() fromCurrency: string;

  @IsString() @IsNotEmpty() toCurrency: string;

  @IsNumber() @Min(0) rate: number;

  @IsOptional() @IsString() rateType?: string;
}
