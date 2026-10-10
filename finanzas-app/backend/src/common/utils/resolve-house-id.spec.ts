import { ForbiddenException } from '@nestjs/common';
import { requireHouseId } from './resolve-house-id';

describe('requireHouseId', () => {
  it('prefers the resolved user.house', () => {
    expect(requireHouseId({ house: { id: 'h1' }, activeHouseId: 'h2' })).toBe('h1');
  });

  it('falls back to activeHouseId, then first house', () => {
    expect(requireHouseId({ activeHouseId: 'h2', houses: [{ id: 'h3' }] })).toBe('h2');
    expect(requireHouseId({ houses: [{ id: 'h3' }] })).toBe('h3');
  });

  it.each([
    [{ house: null, activeHouseId: null, houses: [] }],
    [{}],
    [undefined],
  ])('throws Forbidden with a clear message when there is no active house (%j)', (user) => {
    expect(() => requireHouseId(user)).toThrow(ForbiddenException);
    expect(() => requireHouseId(user)).toThrow('No tienes una casa activa');
  });
});
