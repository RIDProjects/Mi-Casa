import { getMetadataArgsStorage } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { toSafeUser } from './safe-user';

describe('User entity sensitive columns', () => {
  it.each(['password', 'resetToken', 'resetTokenExpiry'])('%s is not selected by default', (prop) => {
    const col = getMetadataArgsStorage().columns.find((c) => c.target === User && c.propertyName === prop);
    expect(col).toBeDefined();
    expect(col.options.select).toBe(false);
  });
});

describe('toSafeUser', () => {
  it('keeps only whitelisted fields', () => {
    const safe = toSafeUser({
      id: 'u1',
      email: 'a@b.c',
      name: 'A',
      isActive: true,
      activeHouseId: 'h1',
      plan: 'free',
      roles: [{ name: 'user' }],
      password: 'hash',
      resetToken: 'tok',
      resetTokenExpiry: new Date(),
      futureSecret: 'x',
    } as any);

    expect(safe).toMatchObject({ id: 'u1', email: 'a@b.c', name: 'A', isActive: true, roles: [{ name: 'user' }] });
    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('resetToken');
    expect(safe).not.toHaveProperty('resetTokenExpiry');
    expect(safe).not.toHaveProperty('futureSecret');
  });

  it('returns null/undefined unchanged', () => {
    expect(toSafeUser(null)).toBeNull();
  });
});
