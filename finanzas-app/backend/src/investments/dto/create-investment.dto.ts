import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { InvestmentType, Currency } from '../../database/entities/investment.entity';

// El frontend (inversiones.tsx) manda "" en vez de omitir campos opcionales
// vacíos (moneda/fechaFin) — @IsOptional() de class-validator solo salta la
// validación si el valor es undefined/null, no con string vacío, así que sin
// este Transform esos "" tiraban 400 (isEnum / isDateString) igual que el
// mismatch de nombres. Se normaliza "" a undefined antes de validar.
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateInvestmentDto {
  @IsString() @IsNotEmpty() nombre: string;

  @IsOptional() @IsEnum(InvestmentType) tipo?: InvestmentType;

  @Type(() => Number) @IsNumber() @Min(0) monto: number;

  @IsOptional() @Transform(emptyToUndefined) @IsEnum(Currency) moneda?: Currency;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tna?: number;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString() fechaInicio?: string;

  @IsOptional() @Transform(emptyToUndefined) @IsDateString() fechaFin?: string;

  @IsOptional() @IsString() notas?: string;

  @IsOptional() @IsBoolean() activo?: boolean;
}
