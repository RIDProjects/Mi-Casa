import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string; email: string };
      request.user = { id: payload.sub, email: payload.email };
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
  };
};
