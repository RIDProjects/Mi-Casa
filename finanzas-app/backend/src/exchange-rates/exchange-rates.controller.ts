import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@ApiTags('Tipos de Cambio')
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly svc: ExchangeRatesService) {}

  @Get('latest')
  getLatest() {
    return this.svc.getLatest();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateExchangeRateDto) {
    return this.svc.create(dto);
  }
}
