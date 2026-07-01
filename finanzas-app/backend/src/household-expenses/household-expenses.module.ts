import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdExpensesController } from './household-expenses.controller';
import { HouseholdExpensesService } from './household-expenses.service';
import { HouseholdExpense } from '../database/entities/household-expense.entity';
import { PurchaseList } from '../database/entities/purchase-list.entity';
import { PurchaseItem } from '../database/entities/purchase-item.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HouseholdExpense, PurchaseList, PurchaseItem]),
    AuthModule,
  ],
  controllers: [HouseholdExpensesController],
  providers: [HouseholdExpensesService],
})
export class HouseholdExpensesModule {}
