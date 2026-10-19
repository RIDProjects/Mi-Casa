import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { HousesService } from '../houses/houses.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly housesService: HousesService,
  ) {}

  // Self-service account deletion (store policies require it). The user is
  // removed; houses where they were the only member are purged too, since
  // nobody else could ever reach that data.
  async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['roles', 'houses'] });
    const credentials = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'password'] });
    if (!user || !credentials) throw new UnauthorizedException('Usuario no encontrado');

    if (user.roles?.some((r) => r.name === 'admin')) {
      throw new ForbiddenException('Las cuentas de administrador global no se pueden eliminar desde la app');
    }
    if (!(await bcrypt.compare(password, credentials.password))) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const soloHouseIds: string[] = [];
    for (const house of user.houses ?? []) {
      const members = await this.housesService.getHouseMembers(house.id);
      if (members.length === 1 && members[0].id === userId) soloHouseIds.push(house.id);
    }

    await this.userRepo.remove(user);

    for (const houseId of soloHouseIds) {
      try {
        await this.housesService.deleteHouse(houseId);
      } catch (e) {
        // The account is already gone; leave the orphan for the admin panel.
        this.logger.error(`No se pudo purgar la casa huérfana ${houseId}: ${e?.message}`);
      }
    }
    return { message: 'Cuenta eliminada' };
  }
}
