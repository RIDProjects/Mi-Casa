import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AssetType } from '../../database/entities/asset.entity';

// assetType is always defaulted to a valid value in patrimonio.tsx today,
// but it's an @IsOptional() @IsEnum() field — same shape as the
// investments moneda/fechaInicio/fechaFin bug, where "" survives
// @IsOptional() and still trips @IsEnum(). Transform defensively so a
// future blank/reset form state can't 400.
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateAssetDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorEstimado?: number;

  @IsOptional() @Transform(emptyToUndefined) @IsEnum(AssetType) assetType?: AssetType;

  @IsOptional() @IsString() notas?: string;
}
