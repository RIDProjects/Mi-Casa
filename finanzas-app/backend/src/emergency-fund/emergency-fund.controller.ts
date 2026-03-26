import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmergencyFundService } from './emergency-fund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Fondo de Emergencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('emergency-fund')
export class EmergencyFundController {
  constructor(private service: EmergencyFundService) {}

  @Get() @RequirePermission('emergency_fund', 'view') findAll(@Request() req) { return this.service.findAll(); }
  @Get(':id') @RequirePermission('emergency_fund', 'view') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @RequirePermission('emergency_fund', 'create') @ApiOperation({ summary: 'Crear calculadora de fondo' })
  create(@Body() dto: any, @Request() req) { return this.service.create(dto, req.user.id); }
  @Put(':id') @RequirePermission('emergency_fund', 'edit') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') @RequirePermission('emergency_fund', 'delete') remove(@Param('id') id: string) { return this.service.remove(id); }
}