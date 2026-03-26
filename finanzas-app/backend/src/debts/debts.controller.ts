import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DebtsService } from './debts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Deudas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('debts')
export class DebtsController {
  constructor(private debtsService: DebtsService) {}

  @Get() @RequirePermission('debts', 'view') @ApiOperation({ summary: 'Listar todas las deudas' })
  findAll(@Request() req) { return this.debtsService.findAll(); }

  @Get('summary') @RequirePermission('debts', 'view') @ApiOperation({ summary: 'Resumen de deudas' })
  getSummary(@Request() req) { return this.debtsService.getSummary(); }

  @Get(':id') @RequirePermission('debts', 'view')
  findOne(@Param('id') id: string) { return this.debtsService.findOne(id); }

  @Post() @RequirePermission('debts', 'create') @ApiOperation({ summary: 'Registrar deuda' })
  create(@Body() dto: any, @Request() req) { return this.debtsService.create(dto, req.user.id); }

  @Put(':id') @RequirePermission('debts', 'edit')
  update(@Param('id') id: string, @Body() dto: any) { return this.debtsService.update(id, dto); }

  @Delete(':id') @RequirePermission('debts', 'delete')
  remove(@Param('id') id: string) { return this.debtsService.remove(id); }
}