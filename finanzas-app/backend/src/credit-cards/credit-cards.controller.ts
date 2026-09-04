import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreditCardsService } from './credit-cards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
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
    return this.service.findByHouse(resolveHouseId(req.user));
  }

  @Post()
  @ApiOperation({ summary: 'Registrar tarjeta de crédito' })
  create(@Body() dto: CreateCreditCardDto, @Request() req) {
    const houseId = resolveHouseId(req.user);
    if (!houseId) throw new BadRequestException('Usuario no pertenece a una casa');
    return this.service.create(dto, houseId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tarjeta de crédito' })
  update(@Param('id') id: string, @Body() dto: UpdateCreditCardDto, @Request() req) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tarjeta de crédito' })
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, resolveHouseId(req.user));
  }
}
