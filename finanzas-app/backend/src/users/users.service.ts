import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
  ) {}

  async findAll() {
    return this.userRepo.find({ relations: ['roles', 'roles.permissions'] });
  }

  async getAdminStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

    const users = await this.userRepo.find({ relations: ['roles'] });
    const total = users.length;

    const activeUsers   = users.filter(u => u.isActive).length;
    const inactiveUsers = users.filter(u => !u.isActive).length;
    const newLast30     = users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
    const activeLast30  = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= thirtyDaysAgo).length;
    const activeLast7   = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= sevenDaysAgo).length;
    const churnRisk     = users.filter(u => u.isActive && u.lastLoginAt && new Date(u.lastLoginAt) < thirtyDaysAgo).length;
    const neverLogged   = users.filter(u => u.isActive && !u.lastLoginAt).length;

    const planDist = {
      free:   users.filter(u => !u.plan || u.plan === 'free').length,
      pro:    users.filter(u => u.plan === 'pro').length,
      family: users.filter(u => u.plan === 'family').length,
    };

    return { total, activeUsers, inactiveUsers, newLast30, activeLast30, activeLast7, churnRisk, neverLogged, planDist };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['roles', 'roles.permissions'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');

    const hashed = await bcrypt.hash(dto.password, 12);
    const roles = dto.roleIds ? await this.roleRepo.findByIds(dto.roleIds) : [];

    const user = this.userRepo.create({ ...dto, password: hashed, roles });
    return this.userRepo.save(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 12);
    if (dto.roleIds) {
      user.roles = await this.roleRepo.findByIds(dto.roleIds);
      delete dto.roleIds;
    }
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepo.remove(user);
    return { message: 'Usuario eliminado' };
  }
}
