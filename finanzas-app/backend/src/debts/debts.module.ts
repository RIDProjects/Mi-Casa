import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Debt } from '../database/entities/debt.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Debt]), AuthModule],
  controllers: [DebtsController],
  providers: [DebtsService],
})
export class DebtsModule {}