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

  @Get() @RequirePermission('inventory', 'view') findAll() { return this.inventoryService.findAll(); }
  @Get('dashboard') @RequirePermission('inventory', 'view') @ApiOperation({ summary: 'Dashboard de inventario' })
  getDashboard() { return this.inventoryService.getDashboard(); }
  @Get(':id') @RequirePermission('inventory', 'view') findOne(@Param('id') id: string) { return this.inventoryService.findOne(id); }
  @Post() @RequirePermission('inventory', 'create') create(@Body() dto: any, @Request() req) { return this.inventoryService.create(dto, req.user.id); }
  @Put(':id') @RequirePermission('inventory', 'edit') update(@Param('id') id: string, @Body() dto: any) { return this.inventoryService.update(id, dto); }
  @Delete(':id') @RequirePermission('inventory', 'delete') remove(@Param('id') id: string) { return this.inventoryService.remove(id); }
}