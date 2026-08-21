import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePurchaseListDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsNumber() @Min(0) budget?: number;

  @IsOptional() @IsString() baseCurrencyCode?: string;
}
