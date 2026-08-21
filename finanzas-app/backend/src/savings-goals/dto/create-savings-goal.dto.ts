import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateSavingsGoalDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @IsNumber() @Min(0) montoMeta?: number;

  @IsOptional() @IsNumber() @Min(0) ahorrosActuales?: number;

  @IsOptional() @IsInt() @Min(1) mesesParaAhorrarla?: number;

  @IsOptional() @IsNumber() @Min(0) tasaInteresAnual?: number;

  @IsOptional() @IsString() emoji?: string;
}
