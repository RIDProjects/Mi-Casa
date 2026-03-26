import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendWhatsAppAlert(phoneNumber: string, productName: string): Promise<void> {
    const provider = process.env.WHATSAPP_PROVIDER || 'twilio'; // 'twilio' | 'meta'

    if (provider === 'twilio') {
      await this.sendViaTwilio(phoneNumber, productName);
    } else {
      await this.sendViaMeta(phoneNumber, productName);
    }
  }

  private async sendViaTwilio(to: string, productName: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio credentials not configured. Skipping WhatsApp notification.');
      return;
    }

    try {
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: from,
          To: `whatsapp:${to}`,
          Body: `⚠️ *Alerta de inventario*\n\nEl producto *"${productName}"* está en su último stock.\n\n_Por favor, añade más pronto._`,
        }),
        { auth: { username: accountSid, password: authToken } }
      );
      this.logger.log(`WhatsApp alert sent for product: ${productName}`);
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp: ${err.message}`);
    }
  }

  private async sendViaMeta(to: string, productName: string) {
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneId = process.env.META_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      this.logger.warn('Meta WhatsApp credentials not configured.');
      return;
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: `⚠️ El producto "${productName}" está en su último stock.` },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      this.logger.log(`Meta WhatsApp alert sent for product: ${productName}`);
    } catch (err) {
      this.logger.error(`Failed to send Meta WhatsApp: ${err.message}`);
    }
  }
}