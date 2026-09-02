import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, PaymentMethod } from '../../database/entities/transaction.entity';

// Nombres de campo en español: es lo que TransactionsService.fromFrontend()
// espera y lo que el frontend/mobile siempre mandaron (ver transacciones.tsx).
// Antes este DTO validaba nombres en inglés (type/concept/amount/date) que
// nunca coincidían con el body real — con whitelist:true en el
// ValidationPipe global, esos campos quedaban pelados y los requeridos
// faltantes tiraban 400 en cada alta/edición de transacción.
export class CreateTransactionDto {
  @IsEnum(TransactionType) tipo: TransactionType;

  @IsString() concepto: string;

  @IsOptional() @IsString() categoria?: string;

  // El form del frontend manda el monto como string ("200") — Type(Number)
  // lo convierte antes de que @IsNumber() lo valide (ValidationPipe ya
  // tiene transform:true, pero eso solo dispara la conversión declarada acá).
  @Type(() => Number) @IsNumber() @Min(0) monto: number;

  @IsOptional() @IsEnum(PaymentMethod) metodoPago?: PaymentMethod;

  @IsOptional() @IsString() nombreTarjeta?: string;

  @IsDateString() fecha: string;

  @IsOptional() @IsString() notas?: string;
}
