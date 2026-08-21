import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { Periodicity } from '../../database/entities/budget.entity';

export class AddExpenseDto {
  @IsString() @IsNotEmpty() name: string;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsEnum(Periodicity) periodicity?: Periodicity;

  @IsOptional() @IsBoolean() isFixed?: boolean;

  @IsOptional() @IsBoolean() isCreditCard?: boolean;

  @IsOptional() @IsBoolean() isAntExpense?: boolean;
}
