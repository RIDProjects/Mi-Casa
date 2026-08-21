import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';

export class CreateBudgetDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsInt() year?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100) savingsTargetPercent?: number;

  @IsOptional() @IsString() rule?: string;
}
