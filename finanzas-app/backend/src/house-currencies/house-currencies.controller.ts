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
import { ElToqueRatesService } from './eltoque-rates.service';
import { HouseCurrenciesService } from './house-currencies.service';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { UpsertRateDto } from './dto/upsert-rate.dto';
import { SetAutoRatesDto } from './dto/set-auto-rates.dto';
import { AddCurrencyDto } from './dto/add-currency.dto';

function assertHouseAccess(user: any, pathHouseId: string): string {
  const houseId = resolveHouseId(user);
  const isAdmin = user?.roles?.some((r: any) => r.name === 'admin');
  const belongsToHouse =
    isAdmin ||
    houseId === pathHouseId ||
    user?.houses?.some((h: any) => h.id === pathHouseId);

  if (!belongsToHouse) {
    throw new ForbiddenException('No tienes acceso a esta casa');
  }

  return houseId === pathHouseId ? houseId : pathHouseId;
}

// Cambiar la moneda base o borrar monedas/tasas es una config a nivel casa,
// no algo que cualquier miembro debería poder tocar — antes solo se
// verificaba membresía, no rol.
function assertHouseAdmin(user: any): void {
  const isAdmin = user?.roles?.some((r: any) => r.name === 'admin' || r.name === 'house_admin');
  if (!isAdmin) {
    throw new ForbiddenException('Solo el administrador de la casa puede modificar las monedas');
  }
}

@ApiTags('Monedas por Casa')
@ApiBearerAuth()
@Controller('houses/:houseId/currencies')
@UseGuards(JwtAuthGuard)
export class HouseCurrenciesController {
  constructor(
    private readonly svc: HouseCurrenciesService,
    private readonly eltoque: ElToqueRatesService,
  ) {}

  @Get('auto-rates')
  getAutoRates(@Param('houseId') houseId: string, @Request() req) {
    return this.eltoque.getStatus(assertHouseAccess(req.user, houseId));
  }

  @Put('auto-rates')
  async setAutoRates(
    @Param('houseId') houseId: string,
    @Body() dto: SetAutoRatesDto,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    assertHouseAdmin(req.user);
    await this.eltoque.setAuto(verifiedHouseId, dto.enabled);
    return this.eltoque.getStatus(verifiedHouseId);
  }

  @Post('rates/refresh')
  refreshRates(@Param('houseId') houseId: string, @Request() req) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    assertHouseAdmin(req.user);
    return this.eltoque.refreshHouse(verifiedHouseId);
  }

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
    assertHouseAdmin(req.user);
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
    assertHouseAdmin(req.user);
    return this.svc.add(verifiedHouseId, dto);
  }

  @Put(':id/set-local')
  setLocal(
    @Param('houseId') houseId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    assertHouseAdmin(req.user);
    return this.svc.setLocal(verifiedHouseId, id);
  }

  @Delete(':id')
  remove(
    @Param('houseId') houseId: string,
    @Param('id') id: string,
    @Request() req,
  ) {
    assertHouseAdmin(req.user);
    const verifiedHouseId = assertHouseAccess(req.user, houseId);
    return this.svc.remove(verifiedHouseId, id);
  }
}
