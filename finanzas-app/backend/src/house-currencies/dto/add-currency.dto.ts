import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AddCurrencyDto {
  @IsString() @IsNotEmpty() currencyCode: string;

  @IsString() @IsNotEmpty() currencyName: string;

  @IsString() @IsNotEmpty() symbol: string;

  @IsOptional() @IsString() locale?: string;

  @IsOptional() @IsBoolean() isBase?: boolean;
}
