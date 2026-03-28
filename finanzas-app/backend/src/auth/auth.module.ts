import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { House } from '../database/entities/house.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
      signOptions: { expiresIn: '24h' },
    }),
    TypeOrmModule.forFeature([User, Role, House]),
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