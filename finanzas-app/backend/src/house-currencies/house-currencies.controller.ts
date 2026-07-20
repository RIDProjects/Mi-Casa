import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HouseCurrenciesService } from './house-currencies.service';

@ApiTags('Monedas por Casa')
@ApiBearerAuth()
@Controller('houses/:houseId/currencies')
@UseGuards(JwtAuthGuard)
export class HouseCurrenciesController {
  constructor(private readonly svc: HouseCurrenciesService) {}

  @Get('rates')
  getRates(@Param('houseId') houseId: string) {
    return this.svc.getRates(houseId);
  }

  @Post('rates')
  upsertRate(@Param('houseId') houseId: string, @Body() dto: any) {
    return this.svc.upsertRate(houseId, dto);
  }

  @Get()
  getAll(@Param('houseId') houseId: string) {
    return this.svc.findByHouse(houseId);
  }

  @Post()
  add(@Param('houseId') houseId: string, @Body() dto: any) {
    return this.svc.add(houseId, dto);
  }

  @Put(':id/set-base')
  setBase(@Param('houseId') houseId: string, @Param('id') id: string) {
    return this.svc.setBase(houseId, id);
  }

  @Delete(':id')
  remove(@Param('houseId') houseId: string, @Param('id') id: string) {
    return this.svc.remove(houseId, id);
  }
}
