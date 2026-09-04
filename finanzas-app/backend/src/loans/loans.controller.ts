import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';

@ApiTags('Créditos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly service: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar créditos de la casa' })
  findAll(@Request() req) {
    return this.service.findByHouse(resolveHouseId(req.user));
  }

  @Post()
  @ApiOperation({ summary: 'Registrar crédito' })
  create(@Body() dto: CreateLoanDto, @Request() req) {
    const houseId = resolveHouseId(req.user);
    if (!houseId) throw new BadRequestException('Usuario no pertenece a una casa');
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar crédito' })
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar crédito' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
