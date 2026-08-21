import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { HouseholdCategory } from '../../database/entities/household-expense.entity';

export class CreateHouseholdExpenseDto {
  @IsDateString() fecha: string;

  @IsString() @IsNotEmpty() descripcion: string;

  @IsOptional() @IsEnum(HouseholdCategory) categoria?: HouseholdCategory;

  @IsNumber() @Min(0) montoCUP: number;

  @IsOptional() @IsString() lugar?: string;

  @IsString() @IsNotEmpty() mes: string;
}
