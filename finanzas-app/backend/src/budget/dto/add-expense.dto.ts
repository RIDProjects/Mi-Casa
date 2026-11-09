import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Matches, Min } from 'class-validator';
import { Periodicity } from '../../database/entities/budget.entity';

export class AddExpenseDto {
  @IsString() @IsNotEmpty() name: string;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsEnum(Periodicity) periodicity?: Periodicity;

  @IsOptional() @IsBoolean() isFixed?: boolean;

  @IsOptional() @IsBoolean() isCreditCard?: boolean;

  @IsOptional() @IsBoolean() isAntExpense?: boolean;

  // Null (update only) resets the line to the house local currency.
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currencyCode?: string | null;
}
