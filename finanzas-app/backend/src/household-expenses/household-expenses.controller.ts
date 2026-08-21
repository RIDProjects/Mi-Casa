import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HouseholdExpensesService } from './household-expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
    const houseId = req.user.house?.id ?? '';
    const m = month || new Date().toISOString().slice(0, 7);
    return this.service.getMonthData(houseId, m);
  }

  @Post()
  create(@Body() dto: CreateHouseholdExpenseDto, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHouseholdExpenseDto, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
