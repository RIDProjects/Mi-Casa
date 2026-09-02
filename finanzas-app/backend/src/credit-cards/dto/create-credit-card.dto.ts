import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CardPaymentType } from '../../database/entities/credit-card.entity';

// Field names already match tarjetas.tsx defaultForm exactly (banco,
// nombreTarjeta, tasaAnual, saldoActual, lineaCredito, fechaCorte,
// fechaPago, tipoPago). The form initializes numeric fields with '' though,
// so they were being sent as strings -> IsNumber() rejected them with 400.
export class CreateCreditCardDto {
  @IsOptional() @IsString() banco?: string;

  @IsOptional() @IsString() nombreTarjeta?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tasaAnual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saldoActual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lineaCredito?: number;

  @IsOptional() @IsString() fechaCorte?: string;

  @IsOptional() @IsString() fechaPago?: string;

  @IsOptional() @IsEnum(CardPaymentType) tipoPago?: CardPaymentType;
}
