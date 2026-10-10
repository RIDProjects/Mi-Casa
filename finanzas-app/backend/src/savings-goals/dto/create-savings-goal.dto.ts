import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavingsGoalDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) montoMeta?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) ahorrosActuales?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) mesesParaAhorrarla?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0, { message: 'La tasa de interés anual debe estar entre 0 y 100 (%)' }) @Max(100, { message: 'La tasa de interés anual debe estar entre 0 y 100 (%)' }) tasaInteres?: number;

  @IsOptional() @IsString() emoji?: string;
}
