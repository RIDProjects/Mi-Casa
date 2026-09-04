import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmergencyFundService } from './emergency-fund.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { resolveHouseId } from '../common/utils/resolve-house-id';
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
    return this.service.findAll(resolveHouseId(req.user));
  }

  @Get('coverage') @RequirePermission('emergency_fund', 'view')
  getCoverage(@Request() req) {
    return this.service.getCoverage(resolveHouseId(req.user));
  }

  @Get(':id') @RequirePermission('emergency_fund', 'view')
  findOne(@Param('id') id: string, @Request() req) {
    return this.service.findOne(id, resolveHouseId(req.user));
  }

  @Post() @RequirePermission('emergency_fund', 'create') @ApiOperation({ summary: 'Crear calculadora de fondo' })
  create(@Body() dto: CreateEmergencyFundDto, @Request() req) {
    const houseId = resolveHouseId(req.user);
    if (!houseId) throw new BadRequestException('Usuario no pertenece a una casa');
    return this.service.create(dto, houseId);
  }

  @Put(':id') @RequirePermission('emergency_fund', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateEmergencyFundDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id') @RequirePermission('emergency_fund', 'delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
