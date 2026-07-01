import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    console.log('[JWT Guard] Auth Header:', authHeader?.substring(0, 30) + '...');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[JWT Guard] No token provided');
      throw new UnauthorizedException('No se proporcionó token');
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = this.jwtService.verify(token) as { sub: string; email: string };
      console.log('[JWT Guard] Payload:', payload);
      
      // Load user with roles, permissions and house from database
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ['roles', 'roles.permissions', 'houses'],
      });

      console.log('[JWT Guard] User loaded:', user?.email, 'roles:', user?.roles?.length);

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Resolver casa activa y exponerla como user.house para todos los controllers
      if (user.houses?.length > 0) {
        const activeHouse = user.activeHouseId
          ? user.houses.find(h => h.id === user.activeHouseId) ?? user.houses[0]
          : user.houses[0];
        (user as any).house = activeHouse ?? null;
      } else {
        (user as any).house = null;
      }

      request.user = user;
      return true;
    } catch (err) {
      console.log('[JWT Guard] Error:', err.message);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}