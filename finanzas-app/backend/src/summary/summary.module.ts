import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';
import { UpcomingBillsNotifierService } from './upcoming-bills-notifier.service';
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
import { HouseCurrenciesModule } from '../house-currencies/house-currencies.module';
import { HousesModule } from '../houses/houses.module';
import { NotificationsModule } from '../notifications/notifications.module';

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
    HouseCurrenciesModule,
    HousesModule,
    NotificationsModule,
  ],
  controllers: [SummaryController],
  providers: [SummaryService, UpcomingBillsNotifierService],
})
export class SummaryModule {}
