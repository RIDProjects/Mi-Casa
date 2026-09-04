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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CuotasService } from './cuotas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { resolveHouseId } from '../common/utils/resolve-house-id';
import { CreateCuotaDto } from './dto/create-cuota.dto';
import { UpdateCuotaDto } from './dto/update-cuota.dto';

@ApiTags('Cuotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cuotas')
export class CuotasController {
  constructor(private readonly cuotasService: CuotasService) {}

  @Get('summary')
  getSummary(@Request() req) {
    return this.cuotasService.getMonthlyCommitment(resolveHouseId(req.user));
  }

  @Get()
  findAll(@Request() req) {
    return this.cuotasService.findByHouse(resolveHouseId(req.user));
  }

  @Post()
  create(@Body() dto: CreateCuotaDto, @Request() req) {
    return this.cuotasService.create(dto, resolveHouseId(req.user));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCuotaDto, @Request() req) {
    return this.cuotasService.update(id, resolveHouseId(req.user), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.cuotasService.remove(id, resolveHouseId(req.user));
  }

  @Post(':id/pay')
  payInstallment(@Param('id') id: string, @Request() req) {
    return this.cuotasService.payInstallment(id, resolveHouseId(req.user));
  }
}
