import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyFundController } from './emergency-fund.controller';
import { EmergencyFundService } from './emergency-fund.service';
import { EmergencyFund, ExpenseCategory } from '../database/entities/emergency-fund.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyFund, ExpenseCategory]), AuthModule],
  controllers: [EmergencyFundController],
  providers: [EmergencyFundService],
})
export class EmergencyFundModule {}