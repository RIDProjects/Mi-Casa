import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from '../../database/entities/user.entity';

describe('JwtAuthGuard token version', () => {
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let guard: JwtAuthGuard;

  const contextFor = (request: any) =>
    ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;
  const newRequest = () => ({ headers: { authorization: 'Bearer tok' } }) as any;
  const userWith = (tokenVersion: number) =>
    ({ id: 'u1', isActive: true, tokenVersion, houses: [] }) as unknown as User;

  beforeEach(() => {
    userRepo = { findOne: jest.fn() } as unknown as jest.Mocked<Repository<User>>;
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService, userRepo);
  });

  it('accepts a token whose tv equals the user tokenVersion', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.c', tv: 2 });
    userRepo.findOne.mockResolvedValue(userWith(2));
    const request = newRequest();

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user.id).toBe('u1');
  });

  it('rejects a token whose tv differs with "Sesión revocada"', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.c', tv: 1 });
    userRepo.findOne.mockResolvedValue(userWith(2));

    const attempt = guard.canActivate(contextFor(newRequest()));
    await expect(attempt).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(contextFor(newRequest()))).rejects.toThrow('Sesión revocada');
  });

  it('accepts a legacy token without tv while tokenVersion is 0', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.c' });
    userRepo.findOne.mockResolvedValue(userWith(0));

    await expect(guard.canActivate(contextFor(newRequest()))).resolves.toBe(true);
  });

  it('rejects a legacy token without tv once tokenVersion > 0', async () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', email: 'a@b.c' });
    userRepo.findOne.mockResolvedValue(userWith(1));

    await expect(guard.canActivate(contextFor(newRequest()))).rejects.toThrow('Sesión revocada');
  });
});
