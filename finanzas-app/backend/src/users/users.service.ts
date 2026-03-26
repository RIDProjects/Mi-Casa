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