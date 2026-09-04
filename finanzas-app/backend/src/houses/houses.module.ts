import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousesController } from './houses.controller';
import { HousesService } from './houses.service';
import { House } from '../database/entities/house.entity';
import { User } from '../database/entities/user.entity';
import { HouseInvitation } from '../database/entities/house-invitation.entity';
import { AuthModule } from '../auth/auth.module';
import { HouseCurrenciesModule } from '../house-currencies/house-currencies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([House, User, HouseInvitation]),
    forwardRef(() => AuthModule),
    HouseCurrenciesModule,
    NotificationsModule,
  ],
  controllers: [HousesController],
  providers: [HousesService],
  exports: [HousesService],
})
export class HousesModule {}
