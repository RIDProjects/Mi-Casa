import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { House } from '../database/entities/house.entity';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let houseRepo: jest.Mocked<Repository<House>>;
  let houseCurrencyRepo: jest.Mocked<Repository<HouseCurrency>>;
  let jwtService: jest.Mocked<JwtService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const registerDto: RegisterDto = {
    name: 'Juan Perez',
    email: 'juan@example.com',
    password: 'Password123',
    houseName: 'Mi Casa',
    housePassword: 'casa123',
  };

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data as User),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    roleRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Role>>;

    houseRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data as House),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<House>>;

    houseCurrencyRepo = {
      create: jest.fn((data) => data as HouseCurrency),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<HouseCurrency>>;

    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    } as unknown as jest.Mocked<JwtService>;

    notificationsService = {
      sendPasswordReset: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    service = new AuthService(
      userRepo,
      roleRepo,
      houseRepo,
      houseCurrencyRepo,
      jwtService,
      notificationsService,
    );
  });

  describe('register', () => {
    it('throws ConflictException when the email is already registered', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-user' } as User);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(houseRepo.findOne).not.toHaveBeenCalled();
    });

    it('creates a new house and makes the first member house_admin when the house does not exist yet', async () => {
      userRepo.findOne.mockResolvedValue(null);
      houseRepo.findOne.mockResolvedValue(null);
      houseRepo.save.mockImplementation(async (h: any) => ({ ...h, id: 'house-1' }));
      houseCurrencyRepo.save.mockResolvedValue({} as HouseCurrency);
      roleRepo.findOne.mockResolvedValue({
        id: 'role-1',
        name: 'house_admin',
        permissions: [],
      } as unknown as Role);
      userRepo.save.mockImplementation(async (u: any) => ({ ...u, id: 'user-1' }));

      const result = await service.register(registerDto);

      expect(result.isHouseAdmin).toBe(true);
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.email).toBe(registerDto.email);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: registerDto.email },
        { expiresIn: '24h' },
      );
    });

    it('throws UnauthorizedException when joining an existing house with the wrong house password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const hashedHousePassword = await bcrypt.hash('correct-password', 12);
      houseRepo.findOne.mockResolvedValue({
        id: 'house-1',
        name: registerDto.houseName,
        password: hashedHousePassword,
        members: [{ id: 'existing-member' }],
      } as unknown as House);

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('joins an existing house as a regular user when the house password is correct', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const hashedHousePassword = await bcrypt.hash(
        registerDto.housePassword,
        12,
      );
      houseRepo.findOne.mockResolvedValue({
        id: 'house-1',
        name: registerDto.houseName,
        password: hashedHousePassword,
        members: [{ id: 'existing-member' }],
      } as unknown as House);
      roleRepo.findOne.mockResolvedValue({
        id: 'role-2',
        name: 'user',
        permissions: [],
      } as unknown as Role);
      userRepo.save.mockImplementation(async (u: any) => ({ ...u, id: 'user-2' }));

      const result = await service.register(registerDto);

      expect(result.isHouseAdmin).toBe(false);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-2', email: registerDto.email },
        { expiresIn: '8h' },
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'juan@example.com',
      password: 'Password123',
    };

    it('throws UnauthorizedException when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('a-different-password', 12);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        password: hashedPassword,
        isActive: true,
        roles: [],
        houses: [],
      } as unknown as User);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('returns a signed JWT and the user payload for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        password: hashedPassword,
        isActive: true,
        activeHouseId: 'house-1',
        roles: [{ name: 'user' }],
        houses: [{ id: 'house-1', name: 'Mi Casa' }],
      } as unknown as User);

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user.house).toEqual({ id: 'house-1', name: 'Mi Casa' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: loginDto.email },
        { expiresIn: '8h' },
      );
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });

    it('signs a longer-lived token for admin users', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 12);
      userRepo.findOne.mockResolvedValue({
        id: 'admin-1',
        email: loginDto.email,
        password: hashedPassword,
        isActive: true,
        activeHouseId: null,
        roles: [{ name: 'admin' }],
        houses: [],
      } as unknown as User);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'admin-1', email: loginDto.email },
        { expiresIn: '24h' },
      );
    });
  });
});
