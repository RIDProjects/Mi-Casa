import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { House } from '../database/entities/house.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(House) private houseRepo: Repository<House>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if email already exists
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash passwords
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const hashedHousePassword = await bcrypt.hash(dto.housePassword, 12);

    // Check if house exists by name
    let house = await this.houseRepo.findOne({ where: { name: dto.houseName } });
    
    if (house) {
      // Verify house password
      const validHousePassword = await bcrypt.compare(dto.housePassword, house.password);
      if (!validHousePassword) {
        throw new UnauthorizedException('Contraseña de casa incorrecta');
      }
    } else {
      // Create new house (first user creates the house)
      house = this.houseRepo.create({
        name: dto.houseName,
        password: hashedHousePassword,
      });
      house = await this.houseRepo.save(house);
    }

    // Get user role
    const userRole = await this.roleRepo.findOne({
      where: { name: 'user' },
      relations: ['permissions'],
    });

    // Check if house already has members to determine if user gets house_admin role
    const houseMembers = await this.userRepo.count({ where: { house: { id: house.id } } });
    const isHouseAdmin = houseMembers === 0; // First user is house admin

    const houseAdminRole = await this.roleRepo.findOne({
      where: { name: 'house_admin' },
      relations: ['permissions'],
    });

    // Determine role: first user = house_admin, others = user
    const roleToAssign = isHouseAdmin && houseAdminRole ? houseAdminRole : userRole;

    if (!roleToAssign) {
      throw new Error('Rol no encontrado. Contacte al administrador.');
    }

    // Create the user with house relationship
    const newUser = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      roles: [roleToAssign],
      house: house,
      isActive: true,
    });

    const savedUser = await this.userRepo.save(newUser);

    // Generate token
    const isAdmin = roleToAssign.name === 'admin' || roleToAssign.name === 'house_admin';
    const expiresIn = isAdmin ? '24h' : '8h';

    const token = this.jwtService.sign(
      { sub: savedUser.id, email: savedUser.email },
      { expiresIn }
    );

    const { password, ...result } = savedUser;
    return { 
      access_token: token, 
      user: { 
        ...result, 
        roles: [roleToAssign],
        house: { id: house.id, name: house.name }
      },
      isHouseAdmin: isHouseAdmin
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
      select: ['id', 'email', 'name', 'password', 'isActive', 'whatsappNumber'],
      relations: ['roles', 'roles.permissions', 'house'],
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // Dynamic JWT expiration based on role
    const isAdmin = user.roles?.some(r => r.name === 'admin');
    const expiresIn = isAdmin ? '24h' : '8h';

    const { password, ...result } = user;
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn }
    );
    
    // Admin global should never have a house
    const houseData = isAdmin ? null : (user.house ? { id: user.house.id, name: user.house.name } : null);
    
    return { 
      access_token: token, 
      user: {
        ...result,
        house: houseData
      }
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId }, 
      relations: ['roles', 'roles.permissions', 'house'] 
    });
    
    if (!user) return user;
    
    // Admin global should never have a house
    const isAdmin = user.roles?.some(r => r.name === 'admin');
    if (isAdmin) {
      return { ...user, house: null };
    }
    
    if (user.house) {
      return {
        ...user,
        house: { id: user.house.id, name: user.house.name }
      };
    }
    return user;
  }
}
