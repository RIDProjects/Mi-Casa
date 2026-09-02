import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoanDto {
  @IsOptional() @IsString() tipo?: string;

  @IsOptional() @IsString() institucion?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deudaInicial?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deudaActual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cuotaMensual?: number;

  @IsOptional() @IsString() notas?: string;

  @IsOptional() @IsInt() @Min(1) @Max(31) diaPago?: number;
}
