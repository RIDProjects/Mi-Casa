import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString() @IsNotEmpty() name: string;

  @IsNumber() @Min(0) monthlyAmount: number;

  @IsOptional() @IsInt() sortOrder?: number;
}
