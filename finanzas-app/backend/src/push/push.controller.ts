import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { requireHouseId } from '../common/utils/resolve-house-id';
import { Request as ExpressRequest } from 'express';

interface AuthRequest extends ExpressRequest {
  user: User;
}

@ApiTags('Push Notifications')
@Controller('push')
export class PushController {
  constructor(private readonly svc: PushService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.svc.getPublicKey() };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(
    @Body() dto: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Request() req: AuthRequest,
  ) {
    return this.svc.subscribe(requireHouseId(req.user), dto);
  }
}
