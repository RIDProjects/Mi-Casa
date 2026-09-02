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
import { Type } from 'class-transformer';

// cardLastFour (no cardLast4): el form de cuotas.tsx siempre mandó
// "cardLastFour". Con whitelist:true en el ValidationPipe global, el campo
// real quedaba pelado silenciosamente (era opcional, así que no tiraba 400,
// pero el dato nunca se guardaba). El mapeo a la columna cardLast4 de la
// entidad se hace explícito en CuotasService.
//
// paidInstallments ahora es opcional: el form de creación nunca lo manda
// (arranca en 0 por diseño — se incrementa vía POST /cuotas/:id/pay), pero
// estaba marcado @IsInt() requerido → 400 en cada alta de cuota nueva.
export class CreateCuotaDto {
  @IsString() description: string;

  @Type(() => Number) @IsNumber() @Min(0) totalAmount: number;

  @Type(() => Number) @IsInt() @Min(1) totalInstallments: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) paidInstallments?: number;

  @Type(() => Number) @IsNumber() @Min(0) installmentAmount: number;

  @IsOptional() @IsString() store?: string;

  @IsOptional() @IsString() cardLastFour?: string;

  @IsDateString() startDate: string;

  @IsOptional() @IsBoolean() withInterest?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) interestRate?: number;
}
