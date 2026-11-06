import { Module } from '@nestjs/common';
import { DebtsModule } from '../debts/debts.module';
import { LoansModule } from '../loans/loans.module';
import { CuotasModule } from '../cuotas/cuotas.module';
import { CreditCardsModule } from '../credit-cards/credit-cards.module';
import { DebtLinesService } from './debt-lines.service';

@Module({
  imports: [DebtsModule, LoansModule, CuotasModule, CreditCardsModule],
  providers: [DebtLinesService],
  exports: [DebtLinesService],
})
export class DebtLinesModule {}
