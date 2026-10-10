import { PermissionAction, PermissionModule } from '../database/entities/permission.entity';

/** Modules whose controllers enforce PermissionGuard. Members get full CRUD on them. */
export const MEMBER_ROLE_MODULES: PermissionModule[] = [
  PermissionModule.DEBTS,
  PermissionModule.PURCHASES,
  PermissionModule.EMERGENCY_FUND,
];

export const MEMBER_ROLE_ACTIONS: PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.CREATE,
  PermissionAction.EDIT,
  PermissionAction.DELETE,
];

export const VIEWER_ROLE_ACTIONS: PermissionAction[] = [PermissionAction.VIEW];
