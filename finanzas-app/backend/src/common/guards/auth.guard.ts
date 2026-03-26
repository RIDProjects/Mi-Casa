import { Injectable, CanActivate, ExecutionContext, Inject, forwardRef } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';

export interface AuthUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    
    try {
      const payload = jwt.default.verify(token, process.env.JWT_SECRET!) as { sub: string };
      
      const user = await this.userRepo.findOne({ 
        where: { id: payload.sub },
        relations: ['roles']
      });

      if (!user || !user.isActive) {
        return false;
      }

      const role = user.roles?.[0];
      request.user = {
        id: user.id,
        email: user.email,
        roleId: role?.id || '',
        roleName: role?.name || '',
      };

      return true;
    } catch {
      return false;
    }
  }
}

export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.roleName !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
};

export const checkPermission = (moduleName: string, action: 'view' | 'create' | 'edit' | 'delete') => {
  return async (req: any, res: any, next: any) => {
    if (req.user?.roleName === 'admin') return next();
    res.status(403).json({ message: `Sin permiso para "${action}" en módulo "${moduleName}"` });
    next();
  };
};
