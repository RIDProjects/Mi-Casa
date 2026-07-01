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
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Transaction } from '../database/entities/transaction.entity';
import { User } from '../database/entities/user.entity';

interface AuthRequest extends Request {
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

@ApiTags('Transacciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Get()
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  findByMonth(
    @Request() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const houseId = resolveHouseId(req.user);
    return this.txService.findByMonth(
      houseId,
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
    );
  }

  @Get('summary')
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'expectedIncome', required: false, type: Number })
  @ApiQuery({ name: 'expectedExpenses', required: false, type: Number })
  getSummary(
    @Request() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('expectedIncome') expectedIncome?: string,
    @Query('expectedExpenses') expectedExpenses?: string,
  ) {
    const houseId = resolveHouseId(req.user);
    return this.txService.getMonthSummary(
      houseId,
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
      parseFloat(expectedIncome) || 0,
      parseFloat(expectedExpenses) || 0,
    );
  }

  @Post()
  create(@Body() dto: Partial<Transaction>, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.txService.create(dto, houseId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<Transaction>) {
    return this.txService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.txService.remove(id);
  }
}
