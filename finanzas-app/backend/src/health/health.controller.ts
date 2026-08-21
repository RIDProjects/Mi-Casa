import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check para el load balancer' })
  check() {
    return { status: 'ok' };
  }
}
