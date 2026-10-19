import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindOperator } from 'typeorm';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

// Emulates Postgres: plain strings match exactly, ILike (no wildcards) matches case-insensitively.
const matchesEmail = (stored: string, cond: any): boolean =>
  cond instanceof FindOperator
    ? stored.toLowerCase() === String(cond.value).replace(/\\(.)/g, '$1').toLowerCase()
    : stored === cond;

describe('RegisterDto', () => {
  const base = { name: 'Juan', email: 'Juan@X.com ', password: 'secret123', houseName: 'Casa', housePassword: 'abc' };

  it('rejects passwords shorter than 8 characters', async () => {
    const errors = await validate(plainToInstance(RegisterDto, { ...base, password: 'abc1234' }));
    expect(errors.map((e) => e.property)).toContain('password');
  });

  it('keeps localCurrencyCode when whitelisting', async () => {
    const dto = plainToInstance(RegisterDto, { ...base, localCurrencyCode: 'USD' });
    expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    expect(dto.localCurrencyCode).toBe('USD');
  });

  it.each(['usd', 'US', 'USDX'])('rejects invalid localCurrencyCode %s', async (code) => {
    const errors = await validate(plainToInstance(RegisterDto, { ...base, localCurrencyCode: code }));
    expect(errors.map((e) => e.property)).toContain('localCurrencyCode');
  });

  it('normalizes email on register, login and forgot-password DTOs', () => {
    expect(plainToInstance(RegisterDto, base).email).toBe('juan@x.com');
    expect(plainToInstance(LoginDto, { email: ' Juan@X.com', password: 'p' }).email).toBe('juan@x.com');
    expect(plainToInstance(ForgotPasswordDto, { email: 'JUAN@X.COM' }).email).toBe('juan@x.com');
  });
});

describe('AuthService email handling', () => {
  let userRepo: any;
  let roleRepo: any;
  let houseRepo: any;
  let houseCurrencyRepo: any;
  let service: AuthService;
  const jwt: any = { sign: jest.fn().mockReturnValue('jwt') };

  beforeEach(() => {
    userRepo = { findOne: jest.fn(), create: jest.fn((d) => d), save: jest.fn(async (u) => ({ id: 'u1', ...u })), update: jest.fn() };
    roleRepo = { findOne: jest.fn().mockResolvedValue({ name: 'house_admin' }) };
    houseRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d),
      save: jest.fn(async (h) => ({ id: 'h1', ...h })),
    };
    houseCurrencyRepo = { create: jest.fn((d) => d), save: jest.fn() };
    service = new AuthService(userRepo, roleRepo, houseRepo, houseCurrencyRepo, {} as any, jwt, {} as any);
  });

  it('login finds a mixed-case stored email when typing lowercase', async () => {
    const password = await bcrypt.hash('Password123', 4);
    const stored = { id: 'u1', email: 'Juan@X.com', password, isActive: true, roles: [], houses: [] };
    userRepo.findOne.mockImplementation(async ({ where }: any) => (matchesEmail(stored.email, where.email) ? stored : null));

    const res = await service.login({ email: 'juan@x.com', password: 'Password123' });
    expect(res.access_token).toBe('jwt');
  });

  it('forgotPassword looks up case-insensitively', async () => {
    const stored = { id: 'u1', email: 'Juan@X.com', name: 'J', isActive: true };
    userRepo.findOne.mockImplementation(async ({ where }: any) => (matchesEmail(stored.email, where.email) ? stored : null));
    const notifications: any = { sendPasswordReset: jest.fn().mockResolvedValue(true) };
    service = new AuthService(userRepo, roleRepo, houseRepo, houseCurrencyRepo, {} as any, jwt, notifications);

    await service.forgotPassword('juan@x.com');
    expect(notifications.sendPasswordReset).toHaveBeenCalled();
  });

  it('register detects an existing mixed-case email and stores the normalized one', async () => {
    userRepo.findOne.mockImplementation(async ({ where }: any) => (matchesEmail('Juan@X.com', where.email) ? { id: 'old' } : null));
    await expect(
      service.register({ name: 'Juan', email: 'juan@x.com', password: 'secret123', houseName: 'C', housePassword: 'abc' }),
    ).rejects.toThrow('El email ya está registrado');

    userRepo.findOne.mockResolvedValue(null);
    await service.register({ name: 'Ana', email: ' Ana@X.com', password: 'secret123', houseName: 'C', housePassword: 'abc' });
    expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@x.com' }));
  });

  it('register seeds the chosen local currency for a new house', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await service.register({
      name: 'Ana', email: 'ana@x.com', password: 'secret123', houseName: 'C', housePassword: 'abc', localCurrencyCode: 'USD',
    });
    expect(houseCurrencyRepo.create).toHaveBeenCalledWith(expect.objectContaining({ currencyCode: 'USD', isLocal: true }));
  });

  it('register defaults to CUP when no currency is chosen', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await service.register({ name: 'Ana', email: 'ana@x.com', password: 'secret123', houseName: 'C', housePassword: 'abc' });
    expect(houseCurrencyRepo.create).toHaveBeenCalledWith(expect.objectContaining({ currencyCode: 'CUP' }));
  });
});
