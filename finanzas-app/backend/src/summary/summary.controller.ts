import { Controller, Get, Query, Request, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

@ApiTags('Resumen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  getSummary(@Request() req: AuthRequest) {
    return this.summaryService.getSummary(resolveHouseId(req.user));
  }

  @Get('upcoming-bills')
  getUpcomingBills(
    @Request() req: AuthRequest,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.summaryService.getUpcomingBills(resolveHouseId(req.user), days);
  }

  @Get('insights')
  getSpendingInsights(@Request() req: AuthRequest) {
    return this.summaryService.getSpendingInsights(resolveHouseId(req.user));
  }

  @Get('health-score')
  getHealthScore(@Request() req: AuthRequest) {
    return this.summaryService.getHealthScore(resolveHouseId(req.user));
  }
}
