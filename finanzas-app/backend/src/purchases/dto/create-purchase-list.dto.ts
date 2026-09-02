import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseListDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budget?: number;

  @IsOptional() @IsString() baseCurrencyCode?: string;
}
