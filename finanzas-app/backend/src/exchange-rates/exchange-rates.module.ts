import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { AuthModule } from '../auth/auth.module';
import { HouseCurrenciesModule } from '../house-currencies/house-currencies.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate]), AuthModule, HouseCurrenciesModule],
  providers: [ExchangeRatesService],
  controllers: [ExchangeRatesController],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
