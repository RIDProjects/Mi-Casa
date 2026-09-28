import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Length,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HouseholdCategory } from '../../database/entities/household-expense.entity';

export class CreateHouseholdExpenseDto {
  @IsDateString() fecha: string;

  @IsString() @IsNotEmpty() descripcion: string;

  @IsOptional() @IsEnum(HouseholdCategory) categoria?: HouseholdCategory;

  // Required unless the deprecated `montoCUP` shim is sent instead (legacy
  // mobile builds that have not updated to the multi-currency contract yet).
  @ValidateIf((o) => o.montoCUP === undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  monto?: number;

  @IsOptional() @IsString() @Length(3, 3) moneda?: string;

  /**
   * @deprecated Legacy field kept for backward compatibility with mobile
   * app builds installed before this change. Treated as `moneda='CUP'`
   * when sent.
   *
   * TODO(open follow-up, design.md Open Questions): remove this field and
   * make `monto`/`moneda` unconditionally required once the minimum
   * supported mobile app version is decided and enforced — see
   * household-expenses.service.ts `normalizeAmount` for the paired
   * service-side shim.
   */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) montoCUP?: number;

  @IsOptional() @IsString() lugar?: string;

  @IsString() @IsNotEmpty() mes: string;
}
