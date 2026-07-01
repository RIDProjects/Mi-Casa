import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NetWorthService } from './net-worth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Post()
  @ApiOperation({ summary: 'Registrar activo' })
  create(@Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id;
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar activo' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar activo' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
