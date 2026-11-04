import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Field names already match presupuesto.tsx (name/year/savingsTargetPercent/rule) —
// no rename needed. The frontend already parses these to numbers before
// sending (parseInt/parseFloat), so this was not 400ing in practice, but
// Type(Number) is added defensively for consistency with the rest of the
// numeric DTOs and to safely coerce any future string input.
export class CreateBudgetDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) savingsTargetPercent?: number;

  @IsOptional() @IsString() rule?: string;

  // Plan overrides: null resets a value to its default.
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(1000) fiMultiplier?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minInvestmentPercent?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(120) emergencyFundMonths?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) entertainmentPercent?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) fixedExpensesCapPercent?: number | null;
}
