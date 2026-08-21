import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HouseCurrenciesService } from './house-currencies.service';
import { UpsertRateDto } from './dto/upsert-rate.dto';
import { AddCurrencyDto } from './dto/add-currency.dto';

function resolveHouseId(user: any): string {
  return user?.house?.id ?? user?.activeHouseId ?? user?.houses?.[0]?.id ?? '';
}

function assertHouseAccess(user: any, pathHouseId: string): string {
  const houseId = resolveHouseId(user);
  const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
  const belongsToHouse =
    isAdmin ||
    houseId === pathHouseId ||
    user?.houses?.some((h: any) => h.id === pathHouseId);

  if (!belongsToHouse) {
    throw new ForbiddenException('No tenés acceso a esta casa');
  }

  return houseId === pathHouseId ? houseId : pathHouseId;
}

@ApiTags('Monedas por Casa')
@ApiBearerAuth()
@Controller('houses/:houseId/currencies')
@UseGuards(JwtAuthGuard)
export class HouseCurrenciesController {
  constructor(private readonly svc: HouseCurrenciesService) {}

  @Get('rates')
  getRates(@Param('houseId') houseId: string, @Request() req) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.getRates(verifiedHouseId);
  }

  @Post('rates')
  upsertRate(
    @Param('houseId') houseId: string,
    @Body() dto: UpsertRateDto,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.upsertRate(verifiedHouseId, dto);
  }

  @Get()
  getAll(@Param('houseId') houseId: string, @Request() req) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.findByHouse(verifiedHouseId);
  }

  @Post()
  add(
    @Param('houseId') houseId: string,
    @Body() dto: AddCurrencyDto,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.add(verifiedHouseId, dto);
  }

  @Put(':id/set-base')
  setBase(
    @Param('houseId') houseId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.setBase(verifiedHouseId, id);
  }

  @Delete(':id')
  remove(
    @Param('houseId') houseId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.remove(verifiedHouseId, id);
  }
}
