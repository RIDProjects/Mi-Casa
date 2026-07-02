import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query, ParseFloatPipe, DefaultValuePipe } from '@nestjs/common';
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
  findAll(@Request() req) {
    const houseId = req.user.house?.id;
    return this.debtsService.findAll(houseId);
  }

  @Get('summary') @RequirePermission('debts', 'view') @ApiOperation({ summary: 'Resumen de deudas' })
  getSummary(@Request() req) {
    const houseId = req.user.house?.id;
    return this.debtsService.getSummary(houseId);
  }

  @Get('payoff') @RequirePermission('debts', 'view') @ApiOperation({ summary: 'Estrategias de pago de deudas' })
  getPayoffStrategies(
    @Request() req,
    @Query('extraPayment', new DefaultValuePipe(0), ParseFloatPipe) extraPayment: number,
  ) {
    const houseId = req.user.house?.id ?? '';
    return this.debtsService.getPayoffStrategies(houseId, extraPayment);
  }

  @Get(':id') @RequirePermission('debts', 'view')
  findOne(@Param('id') id: string) { return this.debtsService.findOne(id); }

  @Post() @RequirePermission('debts', 'create') @ApiOperation({ summary: 'Registrar deuda' })
  create(@Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id;
    if (!houseId) throw new Error('Usuario no pertenece a una casa');
    return this.debtsService.create(dto, houseId);
  }

  @Put(':id') @RequirePermission('debts', 'edit')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.debtsService.update(id, houseId, dto);
  }

  @Delete(':id') @RequirePermission('debts', 'delete')
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.debtsService.remove(id, houseId);
  }
}
