import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Presupuesto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ── Budget CRUD ──────────────────────────────────────────────────────────────

  @Get()
  findAll(@Request() req) {
    const houseId = req.user.house?.id ?? (req.user as any).activeHouseId;
    return this.budgetService.findByHouse(houseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.budgetService.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id ?? (req.user as any).activeHouseId;
    return this.budgetService.create(dto, houseId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.budgetService.remove(id);
  }

  // ── Income sources ───────────────────────────────────────────────────────────
  // NOTE: specific sub-resource routes MUST come before :id to avoid
  // Express treating 'income', 'categories', 'expenses' as an :id param.

  @Post(':id/income')
  addIncome(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.addIncome(id, dto);
  }

  @Put('income/:id')
  updateIncome(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.updateIncome(id, dto);
  }

  @Delete('income/:id')
  removeIncome(@Param('id') id: string) {
    return this.budgetService.removeIncome(id);
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  @Post(':id/categories')
  addCategory(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.addCategory(id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.budgetService.removeCategory(id);
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  @Post('categories/:id/expenses')
  addExpense(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.addExpense(id, dto);
  }

  @Put('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() dto: any) {
    return this.budgetService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  removeExpense(@Param('id') id: string) {
    return this.budgetService.removeExpense(id);
  }
}
