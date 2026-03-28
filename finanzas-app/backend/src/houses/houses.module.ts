import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousesController } from './houses.controller';
import { HousesService } from './houses.service';
import { House } from '../database/entities/house.entity';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([House, User]), AuthModule],
  controllers: [HousesController],
  providers: [HousesService],
  exports: [HousesService],
})
export class HousesModule {}
