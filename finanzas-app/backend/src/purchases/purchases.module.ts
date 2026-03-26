import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { PurchaseItem } from '../database/entities/purchase-item.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseList, PurchaseItem]), AuthModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}