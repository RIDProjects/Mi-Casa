import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HouseholdExpensesService } from './household-expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { CreateHouseholdExpenseDto } from './dto/create-household-expense.dto';
import { UpdateHouseholdExpenseDto } from './dto/update-household-expense.dto';
import { currentMonthInAppTimezone } from '../common/dates';

@ApiTags('Registro de Gastos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('household-expenses')
export class HouseholdExpensesController {
  constructor(private readonly service: HouseholdExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtiene el registro de gastos de un mes (compras + salidas)' })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM' })
  getMonth(@Request() req, @Query('month') month?: string) {
    const m = month || currentMonthInAppTimezone();
    return this.service.getMonthData(resolveHouseId(req.user), m);
  }

  @Post()
  @ApiOperation({
    summary: 'Crea un gasto (moneda + monto ingresado); calcula y persiste el monto base',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, o no hay tasa de cambio configurada para la moneda→base de la casa',
  })
  create(@Body() dto: CreateHouseholdExpenseDto, @Request() req) {
    return this.service.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualiza un gasto; recalcula el monto base solo si monto/moneda/fecha cambian',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, o no hay tasa de cambio configurada para la moneda→base de la casa',
  })
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdExpenseDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un gasto' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
