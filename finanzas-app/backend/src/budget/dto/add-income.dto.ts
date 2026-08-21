import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class AddIncomeDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() type?: string;

  @IsNumber() @Min(0) amount: number;
}
