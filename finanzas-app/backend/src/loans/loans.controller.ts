import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    const houseId = req.user.house?.id;
    return this.service.findByHouse(houseId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar crédito' })
  create(@Body() dto: CreateLoanDto, @Request() req) {
    const houseId = req.user.house?.id;
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar crédito' })
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar crédito' })
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
