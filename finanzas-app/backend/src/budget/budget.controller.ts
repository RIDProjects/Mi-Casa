import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BudgetService } from './budget.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function resolveHouseId(user: any): string {
  return user?.house?.id ?? user?.activeHouseId ?? user?.houses?.[0]?.id ?? '';
}

@ApiTags('Presupuesto')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ── Budget CRUD ──────────────────────────────────────────────────────────────

  @Get()
  findAll(@Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.findByHouse(houseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.budgetService.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.create(dto, houseId);
  }

  @Post(':id/sync-fi-goal')
  syncFiGoal(@Param('id') id: string, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.syncFiGoalForBudget(id, houseId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.update(id, houseId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.remove(id, houseId);
  }

  // ── Income sources ───────────────────────────────────────────────────────────
  // NOTE: specific sub-resource routes MUST come before :id to avoid
  // Express treating 'income', 'categories', 'expenses' as an :id param.

  @Post(':id/income')
  addIncome(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.addIncome(id, houseId, dto);
  }

  @Put('income/:id')
  updateIncome(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.updateIncome(id, houseId, dto);
  }

  @Delete('income/:id')
  removeIncome(@Param('id') id: string, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.removeIncome(id, houseId);
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  @Post(':id/categories')
  addCategory(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.addCategory(id, houseId, dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.budgetService.updateCategory(id, resolveHouseId(req.user), dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.removeCategory(id, houseId);
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  @Post('categories/:id/expenses')
  addExpense(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.addExpense(id, houseId, dto);
  }

  @Put('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.updateExpense(id, houseId, dto);
  }

  @Delete('expenses/:id')
  removeExpense(@Param('id') id: string, @Request() req) {
    const houseId = resolveHouseId(req.user);
    return this.budgetService.removeExpense(id, houseId);
  }
}
