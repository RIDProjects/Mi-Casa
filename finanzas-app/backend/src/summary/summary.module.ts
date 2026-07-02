import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { BudgetModule } from '../budget/budget.module';
import { DebtsModule } from '../debts/debts.module';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { LoansModule } from '../loans/loans.module';
import { SavingsGoalsModule } from '../savings-goals/savings-goals.module';
import { NetWorthModule } from '../net-worth/net-worth.module';
import { EmergencyFundModule } from '../emergency-fund/emergency-fund.module';
import { CuotasModule } from '../cuotas/cuotas.module';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InvestmentsModule } from '../investments/investments.module';

@Module({
  imports: [
    AuthModule,
    BudgetModule,
    DebtsModule,
    CreditCardsModule,
    LoansModule,
    SavingsGoalsModule,
    NetWorthModule,
    EmergencyFundModule,
    CuotasModule,
    TransactionsModule,
    InvestmentsModule,
  ],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
