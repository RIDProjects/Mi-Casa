import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { House } from '../database/entities/house.entity';
import { HouseCurrency } from '../database/entities/house-currency.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { expiresIn: '24h' } };
      },
    }),
    TypeOrmModule.forFeature([User, Role, House, HouseCurrency]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, PassportModule, JwtModule, JwtAuthGuard, TypeOrmModule],
})
export class AuthModule {}