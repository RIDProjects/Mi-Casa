import { Controller, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('test-email')
  async testEmail(@Query('to') to: string) {
    const productName = 'Producto de Prueba';
    await this.notificationsService.sendLowStockEmail(to || 'ridgomez99@gmail.com', productName, to === 'ridgomez99@gmail.com');
    return { message: 'Test email sent', to: to || 'ridgomez99@gmail.com' };
  }
}
