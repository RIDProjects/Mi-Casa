import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmergencyFundService } from './emergency-fund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreateEmergencyFundDto } from './dto/create-emergency-fund.dto';
import { UpdateEmergencyFundDto } from './dto/update-emergency-fund.dto';

@ApiTags('Fondo de Emergencia')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('emergency-fund')
export class EmergencyFundController {
  constructor(private service: EmergencyFundService) {}

  @Get() @RequirePermission('emergency_fund', 'view')
  findAll(@Request() req) {
    const houseId = req.user.house?.id;
    return this.service.findAll(houseId);
  }

  @Get('coverage') @RequirePermission('emergency_fund', 'view')
  getCoverage(@Request() req) {
    const houseId = req.user.house?.id ?? req.user.activeHouseId;
    return this.service.getCoverage(houseId);
  }

  @Get(':id') @RequirePermission('emergency_fund', 'view')
  findOne(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.findOne(id, houseId);
  }

  @Post() @RequirePermission('emergency_fund', 'create') @ApiOperation({ summary: 'Crear calculadora de fondo' })
  create(@Body() dto: CreateEmergencyFundDto, @Request() req) {
    const houseId = req.user.house?.id;
    if (!houseId) throw new Error('Usuario no pertenece a una casa');
    return this.service.create(dto, houseId);
  }

  @Put(':id') @RequirePermission('emergency_fund', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyFundDto, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id') @RequirePermission('emergency_fund', 'delete')
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
