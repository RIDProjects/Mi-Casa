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
    return this.svc.subscribe(resolveHouseId(req.user), dto);
  }
}
