import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { InAppNotificationsService } from './in-app-notifications.service';

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

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly inAppSvc: InAppNotificationsService) {}

  @Get()
  getAll(@Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.inAppSvc.findAllByHouse(houseId);
  }

  // read-all MUST come before :id to avoid route collision
  @Patch('read-all')
  markAllRead(@Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.inAppSvc.markAllRead(houseId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: AuthRequest) {
    const houseId = resolveHouseId(req.user);
    return this.inAppSvc.markRead(id, houseId);
  }
}
