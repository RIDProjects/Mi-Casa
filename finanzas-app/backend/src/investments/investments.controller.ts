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
    return this.svc.getSummary(resolveHouseId(req.user));
  }

  @Post()
  create(@Body() dto: any, @Request() req: AuthRequest) {
    return this.svc.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @Request() req: AuthRequest) {
    return this.svc.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.svc.remove(id, resolveHouseId(req.user));
  }
}
