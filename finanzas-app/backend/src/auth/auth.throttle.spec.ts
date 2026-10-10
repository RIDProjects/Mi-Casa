import 'reflect-metadata';
import { AuthController } from './auth.controller';

const THROTTLER_NAMES = ['short', 'medium', 'long'];
const limitOf = (handler: any, name: string) => Reflect.getMetadata(`THROTTLER:LIMIT${name}`, handler);
const ttlOf = (handler: any, name: string) => Reflect.getMetadata(`THROTTLER:TTL${name}`, handler);

describe('AuthController throttling', () => {
  const proto = AuthController.prototype;
  const cases: Array<[keyof AuthController, number]> = [
    ['register', 5],
    ['login', 5],
    ['forgotPassword', 3],
    ['resetPassword', 3],
  ];

  it.each(cases)('%s overrides a configured throttler with limit %d/min', (method, limit) => {
    const handler = proto[method];
    const overridden = THROTTLER_NAMES.filter((n) => limitOf(handler, n) !== undefined);
    expect(overridden).toContain('medium');
    expect(limitOf(handler, 'medium')).toBe(limit);
    expect(ttlOf(handler, 'medium')).toBe(60000);
  });

  it.each(cases)('%s does not use the unconfigured "default" throttler name', (method) => {
    expect(limitOf(proto[method], 'default')).toBeUndefined();
  });
});
