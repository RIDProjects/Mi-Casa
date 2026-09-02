import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvestmentsService } from './investments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { User } from '../database/entities/user.entity';
import { Request as ExpressRequest } from 'express';

interface AuthRequest extends ExpressRequest {
  user: User;
}

function resolveHouseId(user: User): string {
  return (
    (user as any).house?.id ??
    user.activeHouseId ??
    ((user as any).houses?.[0]?.id) ??
    ''
  );
}

@ApiTags('Inversiones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly svc: InvestmentsService) {}

  @Get()
  getAll(@Request() req: AuthRequest) {
    // El frontend (inversiones.tsx) espera un array plano y ya calcula sus
    // propios totales por moneda / valor actual del lado del cliente — el
    // objeto envolvente {investments, totalByCurrency, count} que devolvía
    // getSummary() nunca lo consume nadie, y hacía que Array.isArray(data)
    // diera false, dejando la lista vacía siempre (aunque hubiera
    // inversiones creadas).
    return this.svc.findAll(resolveHouseId(req.user));
  }

  @Post()
  create(@Body() dto: CreateInvestmentDto, @Request() req: AuthRequest) {
    return this.svc.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvestmentDto, @Request() req: AuthRequest) {
    return this.svc.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.svc.remove(id, resolveHouseId(req.user));
  }
}
