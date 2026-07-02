import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SavingsGoalsService } from './savings-goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Metas de Ahorro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly service: SavingsGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar metas de ahorro de la casa' })
  findAll(@Request() req) {
    const houseId = req.user.house?.id;
    return this.service.findByHouse(houseId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear meta de ahorro' })
  create(@Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id;
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar meta de ahorro' })
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar meta de ahorro' })
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
