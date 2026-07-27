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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest, Response } from 'express';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { User } from '../database/entities/user.entity';

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

@ApiTags('Transacciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Get('export/csv')
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async exportCsv(
    @Query('year') year: string,
    @Query('month') month: string,
    @Request() req: AuthRequest,
    @Res() res: Response,
  ) {
    const houseId = resolveHouseId(req.user);
    const result = await this.txService.findByHouseAndMonth(
      houseId,
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
      1,
      10000,
    );
    const rows = result.data
      .map(t => `${t.fecha},${t.concepto},${t.monto},${t.categoria ?? ''}`)
      .join('\n');
    const csv = `Fecha,Concepto,Monto,Categoría\n${rows}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transacciones-${year}-${month}.csv`,
    );
    res.send(csv);
  }

  @Get()
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findByMonth(
    @Request() req: AuthRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const houseId = resolveHouseId(req.user);
    if (page !== undefined || limit !== undefined) {
      return this.txService.findByHouseAndMonth(
        houseId,
        parseInt(year) || new Date().getFullYear(),
        parseInt(month) || new Date().getMonth() + 1,
        parseInt(page) || 1,
        parseInt(limit) || 50,
      );
    }
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

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.txService.importFromCsv(file.buffer, houseId);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.txService.create(dto, houseId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateTransactionDto, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.txService.update(id, houseId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.txService.remove(id, houseId);
  }
}
