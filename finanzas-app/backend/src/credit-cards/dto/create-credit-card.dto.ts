import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CardPaymentType } from '../../database/entities/credit-card.entity';

// Field names already match tarjetas.tsx defaultForm exactly (banco,
// nombreTarjeta, tasaAnual, saldoActual, lineaCredito, fechaCorte,
// fechaPago, tipoPago). The form initializes numeric fields with '' though,
// so they were being sent as strings -> IsNumber() rejected them with 400.
// tipoPago is always defaulted to a valid value in tarjetas.tsx today, but
// tipoPago is an @IsOptional() @IsEnum() field — same shape as the
// investments moneda/fechaInicio/fechaFin bug, where "" survives
// @IsOptional() and still trips @IsEnum(). Transform defensively so a
// future blank/reset form state can't 400.
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateCreditCardDto {
  @IsOptional() @IsString() banco?: string;

  @IsOptional() @IsString() nombreTarjeta?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0, { message: 'La tasa anual debe estar entre 0 y 100 (%)' }) @Max(100, { message: 'La tasa anual debe estar entre 0 y 100 (%)' }) tasaAnual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) saldoActual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999999.99) lineaCredito?: number;

  @IsOptional() @IsString() fechaCorte?: string;

  @IsOptional() @IsString() fechaPago?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsEnum(CardPaymentType) tipoPago?: CardPaymentType;
}
