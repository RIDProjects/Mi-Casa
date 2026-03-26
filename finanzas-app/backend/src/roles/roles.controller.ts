import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get() @RequirePermission('roles', 'view') findAll() { return this.rolesService.findAll(); }
  @Get('permissions') @RequirePermission('roles', 'view') getPermissions() { return this.rolesService.findAllPermissions(); }
  @Get(':id') @RequirePermission('roles', 'view') findOne(@Param('id') id: string) { return this.rolesService.findOne(id); }
  @Post() @RequirePermission('roles', 'create') create(@Body() dto: any) { return this.rolesService.create(dto); }
  @Put(':id') @RequirePermission('roles', 'edit') update(@Param('id') id: string, @Body() dto: any) { return this.rolesService.update(id, dto); }
  @Delete(':id') @RequirePermission('roles', 'delete') remove(@Param('id') id: string) { return this.rolesService.remove(id); }
}