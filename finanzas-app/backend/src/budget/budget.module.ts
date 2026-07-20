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
import { SavingsGoal } from '../database/entities/savings-goal.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Budget, BudgetCategory, BudgetExpense, IncomeSource, SavingsGoal]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
