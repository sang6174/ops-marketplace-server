// src/infrastructure/mail/mail.service.ts
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { AppException } from '@common/exceptions';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDev = process.env.NODE_ENV === 'development';

    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port', 587);
    const secure = this.configService.get<boolean>('mail.secure', false);
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.password');
    this.from = this.configService.get<string>('mail.from') ?? '';
    this.appUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:3000',
    );

    if (!host) {
      throw new AppException(
        'Mail host is not configured',
        500,
        'MAIL_HOST_MISSING',
        { env: 'mail.host' },
      );
    }
    if (!this.from) {
      throw new AppException(
        'Mail sender (from) is not configured',
        500,
        'MAIL_FROM_MISSING',
        { env: 'mail.from' },
      );
    }

    if (user && !pass) {
      this.logger.warn('Mail password is missing, authentication may fail');
    }

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/verify-email', token);
    const subject = 'Verify your email for OPS Marketplace';
    const text = `Please verify your email by clicking the following link: ${url}`;
    const html = this.buildEmailTemplate(
      'Verify your email',
      'To activate your OPS Marketplace account, please verify your email address.',
      'Verify Email',
      url,
      'This link will expire in 24 hours.',
    );

    await this.sendMailWithRetry({ to, subject, text, html });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/reset-password', token);
    const subject = 'Reset your password for OPS Marketplace';
    const text = `Please reset your password by clicking the following link: ${url}`;
    const html = this.buildEmailTemplate(
      'Reset your password',
      'You requested to reset your password for OPS Marketplace.',
      'Reset Password',
      url,
      'This link will expire in 15 minutes.',
    );

    await this.sendMailWithRetry({ to, subject, text, html });
  }

  private buildEmailTemplate(
    title: string,
    description: string,
    buttonText: string,
    buttonUrl: string,
    expiryNote: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">${title}</h2>
        <p style="color: #555;">${description}</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${buttonUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            ${buttonText}
          </a>
        </p>
        <p style="color: #999; font-size: 14px;">${expiryNote}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, please ignore this email.</p>
      </div>
    `;
  }

  private async sendMailWithRetry(
    options: MailOptions,
    retries = 3,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.sendMail(options);
        this.logger.log(`Email sent to ${options.to} (attempt ${attempt})`);
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Failed to send email to ${options.to}, attempt ${attempt}/${retries}`,
          error instanceof Error ? error.stack : undefined,
        );
        if (attempt < retries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    this.logger.error(
      `Failed to send email to ${options.to} after ${retries} attempts`,
      lastError?.stack,
    );
    throw new ServiceUnavailableException(
      'Unable to send email at this time. Please try again later.',
    );
  }

  private async sendMail(options: MailOptions): Promise<void> {
    if (!this.from) {
      throw new Error('Mail sender (from) is not configured');
    }

    if (this.isDev) {
      this.logger.debug(
        `Sending email to ${options.to} with subject: ${options.subject}`,
      );
      this.logger.debug(`Email HTML: ${options.html.substring(0, 200)}...`);
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        ...options,
      });
      if (this.isDev) {
        this.logger.debug(`Email sent, messageId: ${info.messageId}`);
      }
    } catch (error) {
      this.logger.error(
        `Transport error while sending email to ${options.to}`,
        error,
      );
      throw error;
    }
  }

  private buildUrl(path: string, token: string): string {
    return `${this.appUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
