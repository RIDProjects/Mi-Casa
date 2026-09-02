import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HousesService } from './houses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Casas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('houses')
export class HousesController {
  constructor(private housesService: HousesService) {}

  @Get() 
  @ApiOperation({ summary: 'Listar todas las casas (solo admin global)' })
  findAll(@Request() req) {
    const isAdminGlobal = req.user.roles?.some((r: any) => r.name === 'admin');
    if (!isAdminGlobal) {
      // Return only user's house
      if (req.user.house) {
        return [req.user.house];
      }
      return [];
    }
    return this.housesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalles de una casa' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.housesService.findOne(id, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Ver miembros de una casa' })
  async getMembers(@Param('id') id: string, @Request() req) {
    // Reuse findOne's membership/admin check so only members of the house
    // (or a global admin) can see who belongs to it.
    await this.housesService.findOne(id, req.user.id);
    return this.housesService.getHouseMembers(id);
  }

  @Post(':id/switch')
  @ApiOperation({ summary: 'Cambiar a otra casa (solo admin global)' })
  switchHouse(@Param('id') id: string, @Request() req) {
    return this.housesService.switchUserHouse(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar nombre de casa (solo admin global)' })
  updateHouse(@Param('id') id: string, @Body('name') name: string, @Request() req) {
    const isAdminGlobal = req.user.roles?.some((r: any) => r.name === 'admin');
    if (!isAdminGlobal) throw new ForbiddenException('Solo el admin global puede modificar casas');
    return this.housesService.updateHouse(id, name);
  }

  @Post(':id/members/:userId/toggle-active')
  @ApiOperation({ summary: 'Activar/desactivar miembro de casa (solo admin global)' })
  toggleUserActive(@Param('id') houseId: string, @Param('userId') userId: string, @Request() req) {
    const isAdminGlobal = req.user.roles?.some((r: any) => r.name === 'admin');
    if (!isAdminGlobal) throw new ForbiddenException('Solo el admin global puede modificar miembros');
    return this.housesService.toggleUserActive(houseId, userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Eliminar miembro de casa (solo admin global)' })
  removeUserFromHouse(@Param('id') houseId: string, @Param('userId') userId: string, @Request() req) {
    const isAdminGlobal = req.user.roles?.some((r: any) => r.name === 'admin');
    if (!isAdminGlobal) throw new ForbiddenException('Solo el admin global puede eliminar miembros');
    return this.housesService.removeUserFromHouse(houseId, userId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invitar un usuario al hogar por email' })
  async inviteUser(
    @Param('id') houseId: string,
    @Body() dto: { email: string; role?: string },
    @Request() req,
  ) {
    // Only members of the house (or a global admin) can invite new members —
    // previously any authenticated user could add someone to any house by ID.
    await this.housesService.findOne(houseId, req.user.id);
    return this.housesService.inviteUser(houseId, dto.email, dto.role || 'member', req.user.id);
  }
}
