import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { DebtType } from '../../database/entities/debt.entity';

export class CreateDebtDto {
  @IsString() @IsNotEmpty() personName: string;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsString() note?: string;

  @IsEnum(DebtType) type: DebtType;

  @IsOptional() @IsBoolean() isPaid?: boolean;

  @IsOptional() @IsNumber() @Min(0) interestRate?: number;

  @IsOptional() @IsNumber() @Min(0) minimumPayment?: number;
}
