import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get() @RequirePermission('inventory', 'view') 
  findAll(@Request() req) {
    const houseId = req.user.house?.id;
    return this.inventoryService.findAll(houseId);
  }
  
  @Get('dashboard') @RequirePermission('inventory', 'view') @ApiOperation({ summary: 'Dashboard de inventario' })
  getDashboard(@Request() req) {
    const houseId = req.user.house?.id;
    return this.inventoryService.getDashboard(houseId);
  }
  
  @Get(':id') @RequirePermission('inventory', 'view') findOne(@Param('id') id: string) { return this.inventoryService.findOne(id); }
  
  @Post() @RequirePermission('inventory', 'create') 
  create(@Body() dto: any, @Request() req) {
    const houseId = req.user.house?.id;
    if (!houseId) throw new Error('Usuario no pertenece a una casa');
    return this.inventoryService.create(dto, houseId);
  }
  
  @Put(':id') @RequirePermission('inventory', 'edit') update(@Param('id') id: string, @Body() dto: any) { return this.inventoryService.update(id, dto); }
  
  @Delete(':id') @RequirePermission('inventory', 'delete') remove(@Param('id') id: string) { return this.inventoryService.remove(id); }
}
