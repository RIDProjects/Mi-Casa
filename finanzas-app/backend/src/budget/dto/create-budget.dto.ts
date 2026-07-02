import { IsOptional, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsInt() @Min(2000) @Max(2100) year?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) savingsTargetPercent?: number;
}
