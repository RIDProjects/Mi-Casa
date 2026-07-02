import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { TransactionType, PaymentMethod } from '../../database/entities/transaction.entity';

export class CreateTransactionDto {
  @IsEnum(TransactionType) type: TransactionType;

  @IsString() concept: string;

  @IsOptional() @IsString() category?: string;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;

  @IsOptional() @IsString() cardName?: string;

  @IsDateString() date: string;

  @IsOptional() @IsString() notes?: string;
}
