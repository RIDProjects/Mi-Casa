import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExpenseCategoryDto } from './create-expense-category.dto';

export class CreateEmergencyFundDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) targetMonths?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) minimumMonths?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) savingPeriodMonths?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentBalance?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseCategoryDto)
  categories?: CreateExpenseCategoryDto[];
}
