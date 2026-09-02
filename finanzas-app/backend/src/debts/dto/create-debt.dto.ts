import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtType } from '../../database/entities/debt.entity';

// Field names already match debts.tsx exactly — confirmed via a live curl
// capture: {"personName":"rosi","amount":"500","note":"","type":"i_owe",
// "interestRate":"","minimumPayment":""}. No rename needed, only the
// missing Type(Number) on the numeric fields. Number('') === 0 in JS, so
// this also safely handles the empty-string optional fields with no
// special-casing needed.
export class CreateDebtDto {
  @IsString() @IsNotEmpty() personName: string;

  @Type(() => Number) @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsString() note?: string;

  @IsEnum(DebtType) type: DebtType;

  @IsOptional() @IsBoolean() isPaid?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) interestRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumPayment?: number;
}
