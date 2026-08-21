import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreateRecurringTransactionDto {
  @IsString() @IsNotEmpty() name: string;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsString() category?: string;

  @IsOptional() @IsInt() @Min(1) @Max(31) dayOfMonth?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsDateString() lastGeneratedAt?: string;
}
