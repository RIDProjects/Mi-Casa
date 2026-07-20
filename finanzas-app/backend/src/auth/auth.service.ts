import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { House } from '../database/entities/house.entity';
import { HouseCurrency } from '../database/entities/house-currency.entity';
import { CURRENCY_META } from '../house-currencies/house-currencies.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(HouseCurrency)
    private houseCurrencyRepo: Repository<HouseCurrency>,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    // Hash passwords
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const hashedHousePassword = await bcrypt.hash(dto.housePassword, 12);

    // Find or create house, loading members to determine admin status
    let house = await this.houseRepo.findOne({ where: { name: dto.houseName }, relations: ['members'] });

    if (house) {
      const validHousePassword = await bcrypt.compare(dto.housePassword, house.password);
      if (!validHousePassword) throw new UnauthorizedException('Contraseña de casa incorrecta');
    } else {
      house = this.houseRepo.create({ name: dto.houseName, password: hashedHousePassword });
      house = await this.houseRepo.save(house);
      house.members = [];

      // Seed default base currency for the new house
      const baseCurrencyCode = (dto as any).baseCurrencyCode ?? 'CUP';
      const meta = CURRENCY_META[baseCurrencyCode] ?? CURRENCY_META['CUP'];
      await this.houseCurrencyRepo.save(
        this.houseCurrencyRepo.create({
          currencyCode: baseCurrencyCode,
          currencyName: meta.name,
          symbol: meta.symbol,
          locale: meta.locale,
          isBase: true,
          house: { id: house.id },
        }),
      );
    }

    // First member becomes house_admin; subsequent members get user role
    const houseMembers = house.members?.length ?? 0;
    const isHouseAdmin = houseMembers === 0;

    const roleName = isHouseAdmin ? 'house_admin' : 'user';
    const roleToAssign =
      (await this.roleRepo.findOne({ where: { name: roleName }, relations: ['permissions'] })) ||
      (await this.roleRepo.findOne({ where: { name: 'user' }, relations: ['permissions'] }));

    if (!roleToAssign) throw new Error('Rol no encontrado. Contacte al administrador.');

    const newUser = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      roles: [roleToAssign],
      houses: [house],
      activeHouseId: house.id,
      isActive: true,
    });

    const savedUser = await this.userRepo.save(newUser);

    const isAdmin = roleToAssign.name === 'admin' || roleToAssign.name === 'house_admin';
    const token = this.jwtService.sign(
      { sub: savedUser.id, email: savedUser.email },
      { expiresIn: isAdmin ? '24h' : '8h' },
    );

    const { password, ...result } = savedUser;
    return {
      access_token: token,
      user: {
        ...result,
        roles: [roleToAssign],
        house: { id: house.id, name: house.name },
        houses: [{ id: house.id, name: house.name }],
      },
      isHouseAdmin,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
      select: ['id', 'email', 'name', 'password', 'isActive', 'whatsappNumber', 'activeHouseId', 'plan'],
      relations: ['roles', 'roles.permissions', 'houses'],
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const isAdmin = user.roles?.some(r => r.name === 'admin');
    const { password, ...result } = user;
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: isAdmin ? '24h' : '8h' },
    );

    const activeHouse = isAdmin
      ? null
      : (user.houses?.find(h => h.id === user.activeHouseId) || user.houses?.[0] || null);

    return {
      access_token: token,
      user: {
        ...result,
        house: activeHouse ? { id: activeHouse.id, name: activeHouse.name } : null,
        houses: isAdmin ? [] : (user.houses?.map(h => ({ id: h.id, name: h.name })) || []),
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'houses'],
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isAdmin = user.roles?.some(r => r.name === 'admin');
    if (isAdmin) return { ...user, house: null, houses: [] };

    const activeHouse =
      user.houses?.find(h => h.id === user.activeHouseId) || user.houses?.[0] || null;

    return {
      ...user,
      house: activeHouse ? { id: activeHouse.id, name: activeHouse.name } : null,
      houses: user.houses?.map(h => ({ id: h.id, name: h.name })) || [],
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    // No revelar si el email existe o no (seguridad)
    if (!user || !user.isActive) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.userRepo.update(user.id, { resetToken: token, resetTokenExpiry: expiry });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.notificationsService.sendPasswordReset(user.email, user.name, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }
}
