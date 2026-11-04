import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyFundController } from './emergency-fund.controller';
import { EmergencyFundService } from './emergency-fund.service';
import { EmergencyFund, ExpenseCategory } from '../database/entities/emergency-fund.entity';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BudgetModule } from '../budget/budget.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencyFund, ExpenseCategory]),
    AuthModule,
    TransactionsModule,
    BudgetModule,
  ],
  controllers: [EmergencyFundController],
  providers: [EmergencyFundService],
  exports: [EmergencyFundService],
})
export class EmergencyFundModule {}