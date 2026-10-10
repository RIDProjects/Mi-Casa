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
import { requireHouseId, resolveHouseId } from '../common/utils/resolve-house-id';
import { InAppNotificationsService } from './in-app-notifications.service';

interface AuthRequest extends ExpressRequest {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly inAppSvc: InAppNotificationsService) {}

  @Get()
  getAll(@Request() req: AuthRequest) {
    // Polled from the header on every page: a user without a house just has
    // no notifications (a 403 here would surface as an error everywhere).
    const houseId = resolveHouseId(req.user);
    if (!houseId) return [];
    return this.inAppSvc.findAllByHouse(houseId);
  }

  // read-all MUST come before :id to avoid route collision
  @Patch('read-all')
  markAllRead(@Request() req: AuthRequest) {
    const houseId = requireHouseId(req.user);
    return this.inAppSvc.markAllRead(houseId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: AuthRequest) {
    const houseId = requireHouseId(req.user);
    return this.inAppSvc.markRead(id, houseId);
  }
}
