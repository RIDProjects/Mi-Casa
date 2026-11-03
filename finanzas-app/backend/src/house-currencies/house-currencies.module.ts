import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { House } from '../database/entities/house.entity';
import { ElToqueRatesService } from './eltoque-rates.service';
import { HouseCurrenciesService } from './house-currencies.service';
import { HouseCurrenciesController } from './house-currencies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HouseCurrency, ExchangeRate, House]), AuthModule],
  providers: [HouseCurrenciesService, ElToqueRatesService],
  controllers: [HouseCurrenciesController],
  exports: [HouseCurrenciesService],
})
export class HouseCurrenciesModule {}
