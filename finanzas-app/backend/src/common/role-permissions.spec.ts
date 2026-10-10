import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './guards/permission.guard';
import { PERMISSION_KEY } from './decorators/require-permission.decorator';
import { MEMBER_ROLE_MODULES, MEMBER_ROLE_ACTIONS, VIEWER_ROLE_ACTIONS } from './role-permissions';

const GUARDED_MODULES = ['debts', 'purchases', 'emergency_fund'];
const ALL_ACTIONS = ['view', 'create', 'edit', 'delete'];

function buildMember(roleName: string, modules: string[], actions: string[]) {
  const permissions = modules.flatMap((module) => actions.map((action) => ({ module, action })));
  return { roles: [{ name: roleName, permissions }] };
}

function runGuard(user: any, module: string, action: string): boolean {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'get').mockImplementation((key: any) => (key === PERMISSION_KEY ? { module, action } : undefined));
  const context = {
    getHandler: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return new PermissionGuard(reflector).canActivate(context);
}

describe('seeded role permissions', () => {
  it('grants the member role every action on the guarded modules', () => {
    expect([...MEMBER_ROLE_MODULES].sort()).toEqual([...GUARDED_MODULES].sort());
    expect([...MEMBER_ROLE_ACTIONS].sort()).toEqual([...ALL_ACTIONS].sort());
  });

  it('keeps the viewer role read-only', () => {
    expect(VIEWER_ROLE_ACTIONS).toEqual(['view']);
  });

  describe.each(GUARDED_MODULES)('PermissionGuard for a member on %s', (module) => {
    const member = buildMember('user', [...MEMBER_ROLE_MODULES], [...MEMBER_ROLE_ACTIONS]);

    it.each(ALL_ACTIONS)('allows %s', (action) => {
      expect(runGuard(member, module, action)).toBe(true);
    });

    it('still rejects a view-only member on edit and delete', () => {
      const viewer = buildMember('viewer', [...MEMBER_ROLE_MODULES], [...VIEWER_ROLE_ACTIONS]);
      expect(() => runGuard(viewer, module, 'edit')).toThrow(ForbiddenException);
      expect(() => runGuard(viewer, module, 'delete')).toThrow(ForbiddenException);
    });
  });
});
