import { Controller, Get, Query, Request, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { Request as ExpressRequest } from 'express';
import { requireHouseId } from '../common/utils/resolve-house-id';

interface AuthRequest extends ExpressRequest {
  user: User;
}

@ApiTags('Resumen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  getSummary(@Request() req: AuthRequest) {
    return this.summaryService.getSummary(requireHouseId(req.user));
  }

  @Get('upcoming-bills')
  getUpcomingBills(
    @Request() req: AuthRequest,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.summaryService.getUpcomingBills(requireHouseId(req.user), days);
  }

  @Get('insights')
  getSpendingInsights(@Request() req: AuthRequest) {
    return this.summaryService.getSpendingInsights(requireHouseId(req.user));
  }

  @Get('health-score')
  getHealthScore(@Request() req: AuthRequest) {
    return this.summaryService.getHealthScore(requireHouseId(req.user));
  }
}
