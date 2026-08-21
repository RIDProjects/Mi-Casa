import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { PurchaseStatus } from '../../database/entities/purchase-item.entity';

export class CreatePurchaseItemDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsNumber() @Min(0) quantity?: number;

  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;

  @IsOptional() @IsString() currency?: string;

  @IsOptional() @IsString() lugar?: string;

  @IsOptional() @IsEnum(PurchaseStatus) status?: PurchaseStatus;
}
