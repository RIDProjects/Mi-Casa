import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { HousesModule } from '../houses/houses.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule), HousesModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
