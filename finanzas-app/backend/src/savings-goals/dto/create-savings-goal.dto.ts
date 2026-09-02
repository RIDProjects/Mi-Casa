import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSavingsGoalDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montoMeta?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ahorrosActuales?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) mesesParaAhorrarla?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tasaInteres?: number;

  @IsOptional() @IsString() emoji?: string;
}
