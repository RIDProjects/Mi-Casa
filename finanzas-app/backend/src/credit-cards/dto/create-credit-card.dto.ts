import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { CardPaymentType } from '../../database/entities/credit-card.entity';

export class CreateCreditCardDto {
  @IsOptional() @IsString() banco?: string;

  @IsOptional() @IsString() nombreTarjeta?: string;

  @IsOptional() @IsNumber() @Min(0) tasaAnual?: number;

  @IsOptional() @IsNumber() @Min(0) saldoActual?: number;

  @IsOptional() @IsNumber() @Min(0) lineaCredito?: number;

  @IsOptional() @IsString() fechaCorte?: string;

  @IsOptional() @IsString() fechaPago?: string;

  @IsOptional() @IsEnum(CardPaymentType) tipoPago?: CardPaymentType;
}
