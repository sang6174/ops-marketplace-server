// src/infrastructure/mail/mail.service.ts
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port', 587);
    const secure = this.configService.get<boolean>('mail.secure', false);
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.password');

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/verify-email', token);

    await this.sendMail({
      to,
      subject: 'Xác thực email OPS Marketplace',
      text: `Vui lòng xác thực email bằng link sau: ${url}`,
      html: `
        <p>Chào bạn,</p>
        <p>Vui lòng xác thực email để kích hoạt tài khoản OPS Marketplace.</p>
        <p><a href="${url}">Xác thực email</a></p>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/reset-password', token);

    await this.sendMail({
      to,
      subject: 'Đặt lại mật khẩu OPS Marketplace',
      text: `Vui lòng đặt lại mật khẩu bằng link sau: ${url}`,
      html: `
        <p>Chào bạn,</p>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu OPS Marketplace.</p>
        <p><a href="${url}">Đặt lại mật khẩu</a></p>
        <p>Link này sẽ hết hạn sau 15 phút.</p>
      `,
    });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const from = this.configService.get<string>('mail.from');

    if (!from) {
      throw new ServiceUnavailableException('Email sender is not configured');
    }

    try {
      await this.transporter.sendMail({
        from,
        ...options,
      });
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new ServiceUnavailableException('Không thể gửi email');
    }
  }

  private buildUrl(path: string, token: string): string {
    const appUrl = this.configService.get<string>(
      'app.appUrl',
      'http://localhost:3000',
    );

    return `${appUrl}${path}?token=${encodeURIComponent(token)}`;
  }
}
