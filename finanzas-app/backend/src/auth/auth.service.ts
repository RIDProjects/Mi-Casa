import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
      select: ['id', 'email', 'name', 'password', 'isActive', 'whatsappNumber'],
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    const { password, ...result } = user;
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { access_token: token, user: result };
  }

  async getProfile(userId: string) {
    return this.userRepo.findOne({ where: { id: userId }, relations: ['roles', 'roles.permissions'] });
  }
}