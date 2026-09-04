import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HouseholdExpensesService } from './household-expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { CreateHouseholdExpenseDto } from './dto/create-household-expense.dto';
import { UpdateHouseholdExpenseDto } from './dto/update-household-expense.dto';

@ApiTags('Registro de Gastos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('household-expenses')
export class HouseholdExpensesController {
  constructor(private readonly service: HouseholdExpensesService) {}

  @Get()
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM' })
  getMonth(@Request() req, @Query('month') month?: string) {
    const m = month || new Date().toISOString().slice(0, 7);
    return this.service.getMonthData(resolveHouseId(req.user), m);
  }

  @Post()
  create(@Body() dto: CreateHouseholdExpenseDto, @Request() req) {
    return this.service.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdExpenseDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
