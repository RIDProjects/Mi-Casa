import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean, Min } from 'class-validator';
import { InvestmentType, Currency } from '../../database/entities/investment.entity';

export class CreateInvestmentDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsEnum(InvestmentType) type?: InvestmentType;

  @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsEnum(Currency) currency?: Currency;

  @IsOptional() @IsNumber() @Min(0) annualRate?: number;

  @IsOptional() @IsDateString() startDate?: string;

  @IsOptional() @IsDateString() endDate?: string;

  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
}
