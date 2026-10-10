import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoanDto {
  @IsOptional() @IsString() tipo?: string;

  @IsOptional() @IsString() institucion?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) deudaInicial?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) deudaActual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) cuotaMensual?: number;

  @IsOptional() @IsString() notas?: string;

  @IsOptional() @IsInt() @Min(1) @Max(31) diaPago?: number;
}
