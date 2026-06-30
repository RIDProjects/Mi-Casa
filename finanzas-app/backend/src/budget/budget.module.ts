import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import {
  Budget,
  BudgetCategory,
  BudgetExpense,
  IncomeSource,
} from '../database/entities/budget.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, BudgetCategory, BudgetExpense, IncomeSource]),
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
