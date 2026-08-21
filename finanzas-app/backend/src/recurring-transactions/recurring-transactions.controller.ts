import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecurringTransactionsService } from './recurring-transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
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

@ApiTags('Transacciones Recurrentes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring-transactions')
export class RecurringTransactionsController {
  constructor(private readonly service: RecurringTransactionsService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.service.findByHouse(resolveHouseId(req.user));
  }

  @Post()
  create(@Body() dto: CreateRecurringTransactionDto, @Request() req: AuthRequest) {
    return this.service.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringTransactionDto, @Request() req: AuthRequest) {
    return this.service.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.service.remove(id, resolveHouseId(req.user));
  }

  @Post('generate')
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  generateForMonth(
    @Request() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.generateForMonth(
      resolveHouseId(req.user),
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
    );
  }
}
