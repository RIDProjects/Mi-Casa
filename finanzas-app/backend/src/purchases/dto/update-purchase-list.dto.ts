import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseListDto } from './create-purchase-list.dto';

export class UpdatePurchaseListDto extends PartialType(CreatePurchaseListDto) {}
