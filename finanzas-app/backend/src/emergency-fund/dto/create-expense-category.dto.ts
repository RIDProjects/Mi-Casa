import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseCategoryDto {
  @IsString() @IsNotEmpty() name: string;

  @Type(() => Number) @IsNumber() @Min(0) monthlyAmount: number;

  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
