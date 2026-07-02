import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class CreateCuotaDto {
  @IsString() description: string;

  @IsNumber() @Min(0) totalAmount: number;

  @IsInt() @Min(1) totalInstallments: number;

  @IsInt() @Min(0) paidInstallments: number;

  @IsNumber() @Min(0) installmentAmount: number;

  @IsOptional() @IsString() store?: string;

  @IsOptional() @IsString() cardLast4?: string;

  @IsDateString() startDate: string;

  @IsOptional() @IsBoolean() withInterest?: boolean;

  @IsOptional() @IsNumber() @Min(0) @Max(100) interestRate?: number;
}
