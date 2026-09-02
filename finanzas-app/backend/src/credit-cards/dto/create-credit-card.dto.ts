import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
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

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tasaAnual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saldoActual?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lineaCredito?: number;

  @IsOptional() @IsString() fechaCorte?: string;

  @IsOptional() @IsString() fechaPago?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsEnum(CardPaymentType) tipoPago?: CardPaymentType;
}
