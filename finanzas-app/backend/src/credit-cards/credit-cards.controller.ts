import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreditCardsService } from './credit-cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { UpdateCreditCardDto } from './dto/update-credit-card.dto';

@ApiTags('Tarjetas de Crédito')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly service: CreditCardsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tarjetas de crédito de la casa' })
  findAll(@Request() req) {
    const houseId = req.user.house?.id;
    return this.service.findByHouse(houseId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar tarjeta de crédito' })
  create(@Body() dto: CreateCreditCardDto, @Request() req) {
    const houseId = req.user.house?.id;
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tarjeta de crédito' })
  update(@Param('id') id: string, @Body() dto: UpdateCreditCardDto, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.update(id, houseId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tarjeta de crédito' })
  remove(@Param('id') id: string, @Request() req) {
    const houseId = req.user.house?.id ?? req.user?.activeHouseId ?? req.user?.houses?.[0]?.id ?? '';
    return this.service.remove(id, houseId);
  }
}
