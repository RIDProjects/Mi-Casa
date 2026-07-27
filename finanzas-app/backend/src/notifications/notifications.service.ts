import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if credentials are configured
    if (!smtpUser || !smtpPass) {
      this.logger.warn('⚠️ SMTP credentials not configured. Email notifications will be skipped.');
      this.logger.warn('Please set SMTP_USER and SMTP_PASS environment variables.');
      this.isConfigured = false;
      return;
    }

    // Create transporter with environment variables
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.isConfigured = true;
    this.logger.log(`📧 Email service initialized with SMTP host: ${smtpHost}:${smtpPort}`);
  }

  /**
   * Send low stock alert email notification
   * @param to - Email address to send to
   * @param productName - Name of the product with low stock
   * @param isAdmin - Whether this is an admin notification
   */
  async sendLowStockEmail(to: string, productName: string, isAdmin: boolean): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Email notification skipped (not configured): ${productName} to ${to}`);
      return;
    }

    const from = process.env.SMTP_USER || 'noreply@micasa.pro';
    const adminEmail = 'ridgomez99@gmail.com';
    const subject = isAdmin 
      ? '⚠️ Alerta de Inventario: Stock Bajo' 
      : '⚠️ Notificación de Stock Bajo';
    
    const adminBody = `
Hola Admin,

Se ha detectado un producto con stock bajo:

📦 *Producto:* "${productName}"
📊 *Cantidad:* 1 (última unidad)

Por favor, verifica el inventario y reposición a la brevedad.

---
Mi Casa Pro - Sistema de Alertas
`;

    const userBody = `
Hola,

Te informamos que un producto en el que podrías estar interesado tiene stock bajo:

📦 *Producto:* "${productName}"
📊 *Cantidad:* 1 (última unidad)

---
Mi Casa Pro - Sistema de Notificaciones
`;

    const body = isAdmin ? adminBody : userBody;
    const recipient = isAdmin ? adminEmail : to;

    try {
      const info = await this.transporter.sendMail({
        from: `"Mi Casa Pro" <${from}>`,
        to: recipient,
        subject,
        text: body,
        html: body.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'),
      });
      
      this.logger.log(`✅ Low stock email sent to ${recipient} for product: ${productName} (Message ID: ${info.messageId})`);
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${recipient}: ${err.message}`);
      if (err.code === 'EAUTH') {
        this.logger.error('Authentication error. Check SMTP_USER and SMTP_PASS. For Gmail, use an App Password.');
      }
    }
  }

  /**
   * Send a budget alert email (overBudget, antExpensesWarning, etc.)
   */
  async sendBudgetAlert(to: string, title: string, message: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Budget alert skipped (SMTP not configured): ${title}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"Mi Casa Pro" <${process.env.SMTP_USER || 'noreply@micasa.pro'}>`,
        to,
        subject: `⚠️ ${title}`,
        text: message,
        html: `<p>${message}</p>`,
      });
      this.logger.log(`Budget alert sent to ${to}: ${title}`);
    } catch (err) {
      this.logger.error(`Failed to send budget alert "${title}": ${err.message}`);
    }
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Password reset email skipped (SMTP not configured). Token URL: ${resetUrl}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"Mi Casa Pro" <${process.env.SMTP_USER}>`,
        to,
        subject: '🔑 Recuperación de contraseña — Mi Casa Pro',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <span style="font-size:48px">🏠</span>
              <h1 style="color:#0f172a;font-size:22px;margin:8px 0 0">Mi Casa Pro</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
              <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">Hola ${name},</h2>
              <p style="color:#475569;line-height:1.6;margin:0 0 20px">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                Hacé clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <div style="text-align:center;margin:24px 0">
                <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                  Restablecer contraseña
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:16px 0 0;line-height:1.5">
                Este enlace expira en <strong>1 hora</strong>.<br>
                Si no solicitaste este cambio, podés ignorar este email.
              </p>
            </div>
            <p style="text-align:center;color:#cbd5e1;font-size:12px;margin:20px 0 0">Mi Casa Pro · Sistema de gestión financiera</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${to}: ${err.message}`);
    }
  }

}
