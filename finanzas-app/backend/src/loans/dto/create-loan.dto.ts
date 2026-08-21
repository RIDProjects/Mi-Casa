import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';

export class CreateLoanDto {
  @IsOptional() @IsString() tipo?: string;

  @IsOptional() @IsString() institucion?: string;

  @IsOptional() @IsNumber() @Min(0) deudaInicial?: number;

  @IsOptional() @IsNumber() @Min(0) deudaActual?: number;

  @IsOptional() @IsNumber() @Min(0) cuotaMensual?: number;

  @IsOptional() @IsString() notas?: string;

  @IsOptional() @IsInt() @Min(1) @Max(31) diaPago?: number;
}
