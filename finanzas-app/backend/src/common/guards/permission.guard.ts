import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perm = this.reflector.get<{ module: string; action: string }>(PERMISSION_KEY, context.getHandler());
    if (!perm) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) return false;

    const hasPermission = user.roles?.some(role =>
      role.permissions?.some(p => p.module === perm.module && p.action === perm.action)
    );

    // Admin role bypasses everything
    const isAdmin = user.roles?.some(r => r.name === 'admin');
    if (!isAdmin && !hasPermission) throw new ForbiddenException('No tienes permiso para esta acción');
    return true;
  }
}