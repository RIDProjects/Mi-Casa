import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
    return this.houseRepo.find({ order: { createdAt: 'DESC' }, relations: ['members'] });
  }

  async findOne(id: string) {
    const house = await this.houseRepo.findOne({ where: { id }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');
    return house;
  }

  async getHouseMembers(houseId: string) {
    const house = await this.houseRepo.findOne({ where: { id: houseId }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');
    return house.members || [];
  }

  // Switch user's active house — regular users must already belong to it; global admins get added automatically
  async switchUserHouse(userId: string, houseId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['houses', 'roles'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const isAdminGlobal = user.roles?.some(r => r.name === 'admin');
    const belongsToHouse = user.houses?.some(h => h.id === houseId);

    if (!isAdminGlobal && !belongsToHouse) {
      throw new UnauthorizedException('No pertenecés a esta casa');
    }

    // Admins can freely browse any house — add it to their list if not already present
    if (isAdminGlobal && !belongsToHouse) {
      user.houses = [...(user.houses || []), house];
    }

    user.activeHouseId = houseId;
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
    const house = await this.houseRepo.findOne({ where: { id: houseId }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['houses'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMember = user.houses?.some(h => h.id === houseId);
    if (!isMember) throw new UnauthorizedException('El usuario no pertenece a esta casa');

    user.houses = user.houses.filter(h => h.id !== houseId);
    // Reset active house if the removed one was active
    if (user.activeHouseId === houseId) {
      user.activeHouseId = user.houses[0]?.id || null;
    }
    await this.userRepo.save(user);
    return { message: 'Usuario eliminado de la casa' };
  }

  // Invite an existing user to a house by email
  async addUserToHouse(houseId: string, email: string) {
    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const user = await this.userRepo.findOne({ where: { email }, relations: ['houses'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const alreadyMember = user.houses?.some(h => h.id === houseId);
    if (alreadyMember) throw new BadRequestException('El usuario ya pertenece a esta casa');

    user.houses = [...(user.houses || []), house];
    if (!user.activeHouseId) user.activeHouseId = houseId;
    await this.userRepo.save(user);
    return { message: 'Usuario agregado a la casa' };
  }
}
