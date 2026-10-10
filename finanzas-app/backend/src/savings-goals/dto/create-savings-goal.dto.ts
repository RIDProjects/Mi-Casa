import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavingsGoalDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) montoMeta?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) ahorrosActuales?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) mesesParaAhorrarla?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9.9999, { message: 'tasaInteres must be at most 9.9999 (stored as numeric(5,4))' }) tasaInteres?: number;

  @IsOptional() @IsString() emoji?: string;
}
