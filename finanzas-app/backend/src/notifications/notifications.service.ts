import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend;
  private fromAddress: string;
  private isConfigured: boolean = false;

  constructor() {
    // Railway (y muchos hostings) bloquean SMTP saliente (puertos 587/465) —
    // por eso usamos la API HTTP de Resend en vez de nodemailer.
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn('⚠️ RESEND_API_KEY not configured. Email notifications will be skipped.');
      this.isConfigured = false;
      return;
    }

    this.resend = new Resend(apiKey);
    this.fromAddress = process.env.RESEND_FROM || 'Mi Casa Pro <onboarding@resend.dev>';
    this.isConfigured = true;
    this.logger.log('📧 Email service initialized with Resend');
  }

  /**
   * Send a budget alert email (overBudget, antExpensesWarning, etc.)
   */
  async sendBudgetAlert(to: string, title: string, message: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Budget alert skipped (Resend not configured): ${title}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `⚠️ ${title}`,
        text: message,
        html: `<p>${message}</p>`,
      });
      if (error) throw new Error(error.message);
      this.logger.log(`Budget alert sent to ${to}: ${title}`);
    } catch (err) {
      this.logger.error(`Failed to send budget alert "${title}": ${err.message}`);
    }
  }

  async sendHouseInvitation(
    to: string,
    houseName: string,
    inviterName: string,
    acceptUrl: string,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`House invitation email skipped (Resend not configured). Accept URL: ${acceptUrl}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `🏠 ${inviterName} te invitó a "${houseName}" — Mi Casa Pro`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px">
              <span style="font-size:48px">🏠</span>
              <h1 style="color:#0f172a;font-size:22px;margin:8px 0 0">Mi Casa Pro</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
              <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">¡Te invitaron a una casa!</h2>
              <p style="color:#475569;line-height:1.6;margin:0 0 20px">
                <strong>${inviterName}</strong> te invitó a unirte a <strong>"${houseName}"</strong> en Mi Casa Pro.
                Hacé clic en el botón de abajo para crear tu cuenta y unirte automáticamente.
              </p>
              <div style="text-align:center;margin:24px 0">
                <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                  Aceptar invitación
                </a>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:16px 0 0;line-height:1.5">
                Este enlace expira en <strong>7 días</strong>.<br>
                Si no esperabas esta invitación, podés ignorar este email.
              </p>
            </div>
            <p style="text-align:center;color:#cbd5e1;font-size:12px;margin:20px 0 0">Mi Casa Pro · Sistema de gestión financiera</p>
          </div>
        `,
      });
      if (error) throw new Error(error.message);
      this.logger.log(`House invitation sent to ${to} for house "${houseName}"`);
    } catch (err) {
      this.logger.error(`Failed to send house invitation to ${to}: ${err.message}`);
    }
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Password reset email skipped (Resend not configured). Token URL: ${resetUrl}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
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
      if (error) throw new Error(error.message);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${to}: ${err.message}`);
    }
  }
}
