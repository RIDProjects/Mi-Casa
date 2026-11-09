import { IsString, IsNotEmpty, IsOptional, IsNumber, Matches, Min } from 'class-validator';

export class AddIncomeDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() type?: string;

  @IsNumber() @Min(0) amount: number;

  // Null (update only) resets the line to the house local currency.
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currencyCode?: string | null;
}
