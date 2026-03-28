import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../database/entities/inventory-item.entity';
import { User } from '../database/entities/user.entity';
import { House } from '../database/entities/house.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, User, House]), NotificationsModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}