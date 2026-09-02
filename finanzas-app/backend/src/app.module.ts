import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { HousesModule } from './houses/houses.module';
import { DebtsModule } from './debts/debts.module';
import { PurchasesModule } from './purchases/purchases.module';
import { EmergencyFundModule } from './emergency-fund/emergency-fund.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BudgetModule } from './budget/budget.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { LoansModule } from './loans/loans.module';
import { NetWorthModule } from './net-worth/net-worth.module';
import { HouseholdExpensesModule } from './household-expenses/household-expenses.module';
import { RecurringTransactionsModule } from './recurring-transactions/recurring-transactions.module';
import { SummaryModule } from './summary/summary.module';
import { CuotasModule } from './cuotas/cuotas.module';
import { InvestmentsModule } from './investments/investments.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { PushModule } from './push/push.module';
import { HouseCurrenciesModule } from './house-currencies/house-currencies.module';
import { HealthModule } from './health/health.module';

// Fail-fast en producción: nunca arrancar con credenciales de DB por defecto.
// En desarrollo se mantienen los defaults para no romper el flujo local.
if (process.env.NODE_ENV === 'production') {
  const requiredDbVars = ['DB_USER', 'DB_PASS', 'DB_NAME'];
  const missing = requiredDbVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) in production: ${missing.join(', ')}`,
    );
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,   limit: 20  },  // 20 req/s por IP — protege bursts
      { name: 'medium', ttl: 60000,  limit: 300 },  // 300 req/min — uso normal de la app
      { name: 'long',   ttl: 900000, limit: 1500 }, // 1500 req/15min — evita scraping
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'finanzas_db',
      entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Connection pool: 25 conexiones activas + 5 overflow para picos
      extra: {
        max: 25,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    }),
    AuthModule, UsersModule, RolesModule, HousesModule, DebtsModule,
    PurchasesModule, EmergencyFundModule, NotificationsModule,
    BudgetModule, TransactionsModule, SavingsGoalsModule,
    CreditCardsModule, LoansModule, NetWorthModule, HouseholdExpensesModule,
    RecurringTransactionsModule, SummaryModule, CuotasModule,
    InvestmentsModule, ExchangeRatesModule, PushModule, HouseCurrenciesModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}