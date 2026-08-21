import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NetWorthService } from './net-worth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('Patrimonio Neto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('net-worth')
export class NetWorthController {
  constructor(private readonly service: NetWorthService) {}

  @Get()
  @ApiOperation({ summary: 'Resumen de patrimonio neto con activos' })
  @ApiQuery({ name: 'totalCardBalances', required: false, type: Number })
  @ApiQuery({ name: 'totalLoanDebt', required: false, type: Number })
  findAll(
    @Request() req,
    @Query('totalCardBalances') cardBalances?: string,
    @Query('totalLoanDebt') loanDebt?: string,
  ) {
    const houseId = req.user.house?.id;
    return this.service.getNetWorthSummary(
      houseId,
      cardBalances ? parseFloat(cardBalances) : 0,
      loanDebt ? parseFloat(loanDebt) : 0,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial mensual de patrimonio neto' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  getHistory(
    @Request() req,
    @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  ) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.getHistory(houseId, months);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar activo' })
  create(@Body() dto: CreateAssetDto, @Request() req) {
    const houseId = req.user.house?.id;
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar activo' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar activo' })
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
