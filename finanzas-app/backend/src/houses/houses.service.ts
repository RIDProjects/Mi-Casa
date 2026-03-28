import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { House } from '../database/entities/house.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class HousesService {
  constructor(
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findAll() {
    return this.houseRepo.find({ 
      order: { createdAt: 'DESC' },
      relations: ['members'] 
    });
  }

  async findOne(id: string) {
    const house = await this.houseRepo.findOne({ 
      where: { id },
      relations: ['members'] 
    });
    if (!house) throw new NotFoundException('Casa no encontrada');
    return house;
  }

  async getHouseMembers(houseId: string) {
    const house = await this.houseRepo.findOne({
      where: { id: houseId },
      relations: ['members']
    });
    if (!house) throw new NotFoundException('Casa no encontrada');
    return house.members || [];
  }

  // Switch user's current house (for admin global)
  async switchUserHouse(userId: string, houseId: string) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['house', 'roles']
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    // Check if user belongs to this house (unless admin global)
    const isAdminGlobal = user.roles?.some((r: any) => r.name === 'admin');
    if (!isAdminGlobal && user.house?.id !== houseId) {
      throw new UnauthorizedException('No pertenecés a esta casa');
    }

    user.house = house;
    return this.userRepo.save(user);
  }

  async updateHouse(id: string, name: string) {
    const house = await this.houseRepo.findOne({ where: { id } });
    if (!house) throw new NotFoundException('Casa no encontrada');
    house.name = name;
    return this.houseRepo.save(house);
  }

  async toggleUserActive(houseId: string, userId: string) {
    const house = await this.houseRepo.findOne({ where: { id: houseId }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMember = house.members?.some(m => m.id === userId);
    if (!isMember) throw new UnauthorizedException('El usuario no pertenece a esta casa');

    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async removeUserFromHouse(houseId: string, userId: string) {
    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.house?.id !== houseId) {
      throw new UnauthorizedException('El usuario no pertenece a esta casa');
    }

    user.house = null as any;
    await this.userRepo.save(user);
    return { message: 'Usuario eliminado de la casa' };
  }
}
