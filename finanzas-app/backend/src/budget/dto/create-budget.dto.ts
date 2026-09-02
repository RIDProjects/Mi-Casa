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
}
