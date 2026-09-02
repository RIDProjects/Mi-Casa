import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HousesService } from '../houses/houses.service';
import { SummaryService } from './summary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';

// Ventana de "hay que actuar ya" para el recordatorio proactivo — distinta
// de los 30 días que usa la pantalla de Vencimientos (esa es para planear,
// no para alertar). 3 días alcanza para reaccionar sin generar ruido con
// semanas de anticipación.
const REMINDER_WINDOW_DAYS = 3;

// El `type` de la notificación incluye el vencimiento puntual (tipo +
// nombre + fecha), así que createIfNotRecent dedupea por ocurrencia real —
// el mismo pago recurrente el mes que viene tiene una fecha distinta y
// genera un type distinto, no queda bloqueado para siempre.
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

@Injectable()
export class UpcomingBillsNotifierService {
  private readonly logger = new Logger(UpcomingBillsNotifierService.name);

  constructor(
    private readonly housesService: HousesService,
    private readonly summaryService: SummaryService,
    private readonly notificationsService: NotificationsService,
    private readonly inAppNotificationsService: InAppNotificationsService,
  ) {}

  // Corre una vez por día — un cron mas frecuente no aporta nada porque el
  // dedup por dia+tipo+nombre ya evita mandar el mismo aviso dos veces
  // dentro de la ventana de REMINDER_WINDOW_DAYS.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkUpcomingBills(): Promise<void> {
    const houses = await this.housesService.findAll();
    for (const house of houses) {
      try {
        await this.notifyHouse(house.id);
      } catch (e) {
        // una casa con datos raros no debe frenar el chequeo de las demas
        this.logger.error(`Fallo el chequeo de vencimientos de la casa ${house.id}: ${e.message}`);
      }
    }
  }

  private async notifyHouse(houseId: string): Promise<void> {
    const bills = await this.summaryService.getUpcomingBills(houseId, REMINDER_WINDOW_DAYS);
    if (bills.length === 0) return;

    const to = process.env.SMTP_USER || 'ridgomez99@gmail.com';

    for (const bill of bills) {
      const dueLabel = bill.daysUntilDue <= 0 ? 'hoy' : `en ${bill.daysUntilDue} día${bill.daysUntilDue === 1 ? '' : 's'}`;
      const title = 'Vencimiento próximo';
      const message = `${bill.name} vence ${dueLabel} (${bill.dueDate}) — $${bill.amount}`;
      const dedupeType = `upcoming_bill_${bill.type}_${slug(bill.name)}_${bill.dueDate}`;

      const created = await this.inAppNotificationsService.createIfNotRecent(
        houseId,
        { type: dedupeType, title, message },
        24 * (REMINDER_WINDOW_DAYS + 1), // cubre toda la ventana de recordatorio, no solo un dia
      );

      // Solo mandar el email la primera vez que se crea la notificación
      // in-app (created !== null) — si ya está deduplicada, ya se avisó.
      if (created) {
        await this.notificationsService.sendBudgetAlert(to, title, message);
      }
    }
  }
}
