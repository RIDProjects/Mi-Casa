import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SavingsGoalsService } from './savings-goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@ApiTags('Metas de Ahorro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly service: SavingsGoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar metas de ahorro de la casa' })
  findAll(@Request() req) {
    return this.service.findByHouse(resolveHouseId(req.user));
  }

  @Post()
  @ApiOperation({ summary: 'Crear meta de ahorro' })
  create(@Body() dto: CreateSavingsGoalDto, @Request() req) {
    const houseId = resolveHouseId(req.user);
    if (!houseId) throw new BadRequestException('Usuario no pertenece a una casa');
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar meta de ahorro' })
  update(@Param('id') id: string, @Body() dto: UpdateSavingsGoalDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar meta de ahorro' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
