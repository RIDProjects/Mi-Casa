import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
  ) {}

  findAll() { return this.roleRepo.find({ relations: ['permissions'] }); }

  async findOne(id: string) {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async create(dto: { name: string; description?: string; permissionIds?: string[] }) {
    const permissions = dto.permissionIds ? await this.permRepo.findByIds(dto.permissionIds) : [];
    const role = this.roleRepo.create({ name: dto.name, description: dto.description, permissions });
    return this.roleRepo.save(role);
  }

  async update(id: string, dto: { name?: string; description?: string; permissionIds?: string[] }) {
    const role = await this.findOne(id);
    if (dto.permissionIds) role.permissions = await this.permRepo.findByIds(dto.permissionIds);
    if (dto.name) role.name = dto.name;
    if (dto.description) role.description = dto.description;
    return this.roleRepo.save(role);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    await this.roleRepo.remove(role);
    return { message: 'Rol eliminado' };
  }

  findAllPermissions() { return this.permRepo.find(); }
}