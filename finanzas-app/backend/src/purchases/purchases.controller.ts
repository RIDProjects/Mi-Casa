import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreatePurchaseListDto } from './dto/create-purchase-list.dto';
import { UpdatePurchaseListDto } from './dto/update-purchase-list.dto';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from './dto/update-purchase-item.dto';

@ApiTags('Compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get('lists') @RequirePermission('purchases', 'view') 
  findAllLists(@Request() req) {
    const houseId = req.user.house?.id;
    return this.purchasesService.findAllLists(houseId);
  }
  
  @Get('lists/:id') @RequirePermission('purchases', 'view') findOneList(@Param('id') id: string) { return this.purchasesService.findOneList(id); }
  
  @Post('lists') @RequirePermission('purchases', 'create') 
  createList(@Body() dto: CreatePurchaseListDto, @Request() req) {
    const houseId = req.user.house?.id;
    if (!houseId) throw new Error('Usuario no pertenece a una casa');
    return this.purchasesService.createList(dto, houseId);
  }

  @Put('lists/:id') @RequirePermission('purchases', 'edit') updateList(@Param('id') id: string, @Body() dto: UpdatePurchaseListDto) { return this.purchasesService.updateList(id, dto); }
  @Delete('lists/:id') @RequirePermission('purchases', 'delete') removeList(@Param('id') id: string) { return this.purchasesService.removeList(id); }

  @Post('lists/:listId/items') @RequirePermission('purchases', 'create')
  addItem(@Param('listId') listId: string, @Body() dto: CreatePurchaseItemDto) { return this.purchasesService.addItem(listId, dto); }

  @Put('items/:id') @RequirePermission('purchases', 'edit')
  updateItem(@Param('id') id: string, @Body() dto: UpdatePurchaseItemDto) { return this.purchasesService.updateItem(id, dto); }

  @Delete('items/:id') @RequirePermission('purchases', 'delete')
  removeItem(@Param('id') id: string) { return this.purchasesService.removeItem(id); }
}
