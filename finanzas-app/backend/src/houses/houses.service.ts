import { Injectable, Logger, NotFoundException, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { House } from '../database/entities/house.entity';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { HouseInvitation } from '../database/entities/house-invitation.entity';
import { HouseCurrenciesService, CURRENCY_META } from '../house-currencies/house-currencies.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HousesService {
  private readonly logger = new Logger(HousesService.name);

  constructor(
    @InjectRepository(House) private houseRepo: Repository<House>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(HouseInvitation) private invitationRepo: Repository<HouseInvitation>,
    private readonly houseCurrenciesService: HouseCurrenciesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Creates a house (with hashed password) and seeds the base currency.
   * Used by programmatic house creation outside of the auth registration flow.
   */
  async create(dto: {
    name: string;
    hashedPassword: string;
    baseCurrencyCode?: string;
  }): Promise<House> {
    const house = this.houseRepo.create({
      name: dto.name,
      password: dto.hashedPassword,
    });
    const saved = await this.houseRepo.save(house);

    const code = dto.baseCurrencyCode ?? 'CUP';
    const meta = CURRENCY_META[code] ?? CURRENCY_META['CUP'];
    await this.houseCurrenciesService.add(saved.id, {
      currencyCode: code,
      currencyName: meta.name,
      symbol: meta.symbol,
      locale: meta.locale,
      isBase: true,
    });

    return saved;
  }

  async findAll() {
    return this.houseRepo.find({ order: { createdAt: 'DESC' }, relations: ['members'] });
  }

  async findOne(id: string, requestingUserId?: string) {
    const house = await this.houseRepo.findOne({ where: { id }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');

    if (requestingUserId) {
      const isMember = house.members?.some(m => m.id === requestingUserId);
      if (!isMember) {
        const user = await this.userRepo.findOne({ where: { id: requestingUserId }, relations: ['roles'] });
        const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
        if (!isAdmin) throw new ForbiddenException('No tenés acceso a esta casa');
      }
    }

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

  // Global admin, o house_admin de esa casa puntual, puede gestionar sus propios miembros.
  private async assertCanManageHouse(houseId: string, requestingUserId: string): Promise<void> {
    const requester = await this.userRepo.findOne({
      where: { id: requestingUserId },
      relations: ['roles', 'houses'],
    });
    const isGlobalAdmin = requester?.roles?.some((r) => r.name === 'admin');
    const isHouseAdminHere =
      requester?.roles?.some((r) => r.name === 'house_admin') &&
      requester?.houses?.some((h) => h.id === houseId);
    if (!isGlobalAdmin && !isHouseAdminHere) {
      throw new ForbiddenException('No tenés permiso para gestionar los miembros de esta casa');
    }
  }

  async toggleUserActive(houseId: string, userId: string, requestingUserId: string) {
    await this.assertCanManageHouse(houseId, requestingUserId);

    const house = await this.houseRepo.findOne({ where: { id: houseId }, relations: ['members'] });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMember = house.members?.some(m => m.id === userId);
    if (!isMember) throw new UnauthorizedException('El usuario no pertenece a esta casa');

    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async removeUserFromHouse(houseId: string, userId: string, requestingUserId: string) {
    await this.assertCanManageHouse(houseId, requestingUserId);

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

  // Invite a user by email — if they already have an account, add them directly;
  // otherwise create/refresh a pending HouseInvitation and email them a signup link.
  async inviteUser(houseId: string, email: string, role: string, invitedById: string) {
    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    const roleToUse = role === 'house_admin' ? 'house_admin' : 'user';

    const user = await this.userRepo.findOne({ where: { email }, relations: ['houses'] });
    if (user) {
      const alreadyMember = user.houses?.some(h => h.id === houseId);
      if (alreadyMember) throw new ConflictException('Ya es miembro de este hogar');

      user.houses = [...(user.houses || []), house];
      if (!user.activeHouseId) user.activeHouseId = houseId;
      await this.userRepo.save(user);
      return { status: 'added', userId: user.id };
    }

    const inviter = await this.userRepo.findOne({ where: { id: invitedById } });

    let invitation = await this.invitationRepo.findOne({
      where: { email, houseId, status: 'pending' },
    });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    if (invitation) {
      invitation.token = token;
      invitation.expiresAt = expiresAt;
      invitation.role = roleToUse;
    } else {
      invitation = this.invitationRepo.create({
        email,
        houseId,
        role: roleToUse,
        token,
        expiresAt,
        invitedById,
      });
    }
    await this.invitationRepo.save(invitation);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/register?invitationToken=${token}`;
    const sent = await this.notificationsService.sendHouseInvitation(
      email,
      house.name,
      inviter?.name || 'Un miembro de la casa',
      acceptUrl,
    );
    if (!sent) {
      this.logger.warn(`House invitation email failed to send to ${email} for house ${houseId} — invitation record was still created`);
    }

    return { status: 'invitation_sent', message: 'Invitación enviada por email' };
  }

  async getInvitationByToken(token: string): Promise<HouseInvitation | null> {
    return this.invitationRepo.findOne({ where: { token }, relations: ['house'] });
  }

  async markInvitationAccepted(id: string): Promise<void> {
    await this.invitationRepo.update(id, { status: 'accepted' });
  }

  // El house_admin puede crear cuentas directamente dentro de su propia casa
  // (nombre + email + contraseña) y pasarle esas credenciales al usuario a mano —
  // no depende de mandar ningún email.
  async createHouseMember(
    houseId: string,
    dto: { name: string; email: string; password: string; role?: string },
    requestingUserId: string,
  ) {
    const house = await this.houseRepo.findOne({ where: { id: houseId } });
    if (!house) throw new NotFoundException('Casa no encontrada');

    await this.assertCanManageHouse(houseId, requestingUserId);

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const roleName = dto.role === 'house_admin' ? 'house_admin' : 'user';
    const roleToAssign =
      (await this.roleRepo.findOne({ where: { name: roleName }, relations: ['permissions'] })) ||
      (await this.roleRepo.findOne({ where: { name: 'user' }, relations: ['permissions'] }));
    if (!roleToAssign) throw new Error('Rol no encontrado. Contacte al administrador.');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      roles: [roleToAssign],
      houses: [house],
      activeHouseId: house.id,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);

    const { password, ...result } = saved;
    return { status: 'created', user: result };
  }
}
