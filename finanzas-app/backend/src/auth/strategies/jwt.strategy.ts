import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    console.log('[JWT] Validating payload:', payload);
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['roles', 'roles.permissions', 'houses'],
    });
    console.log('[JWT] User found:', user ? user.email : 'NOT FOUND', 'isActive:', user?.isActive);
    if (!user) throw new UnauthorizedException();

    // Resolve active house and attach as `house` for backward compatibility
    // All controllers that use req.user.house?.id continue to work unchanged
    if (user.houses && user.houses.length > 0) {
      const activeHouse = user.activeHouseId
        ? user.houses.find(h => h.id === user.activeHouseId) || user.houses[0]
        : user.houses[0];
      (user as any).house = activeHouse || null;
    } else {
      (user as any).house = null;
    }

    return user;
  }
}
