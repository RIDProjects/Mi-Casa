import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

// NOTE: POST /exchange-rates has no caller in frontend/src (no exchangeRatesAPI
// exists in services/api.ts) or mobile — currency rates are actually managed
// through houseCurrenciesAPI (/houses/:id/currencies/rates), a separate
// controller. This DTO is effectively dead from the web app today, so there's
// no wire payload to compare field names against. Type(Number) added
// defensively for consistency with the rest of the numeric DTOs in case this
// endpoint gets wired up (e.g. a future admin/cron caller).
export class CreateExchangeRateDto {
  @IsString() @IsNotEmpty() fromCurrency: string;

  @IsString() @IsNotEmpty() toCurrency: string;

  @Type(() => Number) @IsNumber() @Min(0) rate: number;

  @IsDateString() date: string;

  @IsOptional() @IsString() source?: string;

  @IsOptional() @IsString() rateType?: string;
}
