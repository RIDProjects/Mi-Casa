import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../../database/entities/asset.entity';

export class CreateAssetDto {
  @IsOptional() @IsString() nombre?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) valorEstimado?: number;

  @IsOptional() @IsEnum(AssetType) assetType?: AssetType;

  @IsOptional() @IsString() notas?: string;
}
