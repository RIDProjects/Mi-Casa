import { User } from '../database/entities/user.entity';

/**
 * Whitelist of user fields that may be sent to clients. Anything not listed here
 * (password, reset token, future columns) is dropped by default.
 */
const SAFE_USER_FIELDS = [
  'id',
  'email',
  'name',
  'isActive',
  'activeHouseId',
  'plan',
  'lastLoginAt',
  'roles',
  'createdAt',
  'updatedAt',
] as const;

export function toSafeUser(user: User | null | undefined): Partial<User> | null | undefined {
  if (!user) return user;
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_USER_FIELDS) {
    if ((user as any)[field] !== undefined) safe[field] = (user as any)[field];
  }
  if (Array.isArray(user.houses)) {
    safe.houses = user.houses.map((h) => ({ id: h.id, name: h.name }));
  }
  return safe as Partial<User>;
}
