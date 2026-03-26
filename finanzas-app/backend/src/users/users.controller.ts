import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get() @RequirePermission('users', 'view') @ApiOperation({ summary: 'Listar usuarios' })
  findAll() { return this.usersService.findAll(); }

  @Get(':id') @RequirePermission('users', 'view')
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post() @RequirePermission('users', 'create') @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Put(':id') @RequirePermission('users', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Delete(':id') @RequirePermission('users', 'delete')
  remove(@Param('id') id: string) { return this.usersService.remove(id); }
}