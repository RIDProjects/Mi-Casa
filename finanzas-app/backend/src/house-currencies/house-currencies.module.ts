import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { ExchangeRate } from '../database/entities/exchange-rate.entity';
import { HouseCurrenciesService } from './house-currencies.service';
import { HouseCurrenciesController } from './house-currencies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HouseCurrency, ExchangeRate]), AuthModule],
  providers: [HouseCurrenciesService],
  controllers: [HouseCurrenciesController],
  exports: [HouseCurrenciesService],
})
export class HouseCurrenciesModule {}
