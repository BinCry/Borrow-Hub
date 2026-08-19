import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

type PasswordResetEmail = {
  email: string;
  fullName: string;
  token: string;
};

type AccountDeletionEmail = PasswordResetEmail;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };

    return entities[character] ?? character;
  });
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string | null;
  private readonly passwordResetUrl: string | null;
  private readonly accountDeletionUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<boolean>('SMTP_SECURE');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASSWORD');

    this.fromAddress = this.configService.get<string>('SMTP_FROM') ?? null;
    this.passwordResetUrl =
      this.configService.get<string>('PASSWORD_RESET_URL') ?? null;
    this.accountDeletionUrl =
      this.configService.get<string>('ACCOUNT_DELETION_URL') ?? null;

    if (!host || !port || secure === undefined || !this.fromAddress) {
      this.transporter = null;
      return;
    }

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized:
          this.configService.get<string>('NODE_ENV') === 'production',
      },
    });
  }

  async sendPasswordReset(input: PasswordResetEmail): Promise<boolean> {
    if (!this.transporter || !this.fromAddress || !this.passwordResetUrl) {
      return false;
    }

    const resetUrl = new URL(this.passwordResetUrl);
    resetUrl.searchParams.set('token', input.token);
    const safeName = escapeHtml(input.fullName);
    const safeResetUrl = escapeHtml(resetUrl.toString());

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        subject: 'Đặt lại mật khẩu Borrow Hub',
        text: [
          `Xin chào ${input.fullName},`,
          '',
          'Bạn vừa yêu cầu đặt lại mật khẩu Borrow Hub.',
          `Mở liên kết sau trong vòng 30 phút: ${resetUrl.toString()}`,
          '',
          'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.',
        ].join('\n'),
        html: [
          `<p>Xin chào ${safeName},</p>`,
          '<p>Bạn vừa yêu cầu đặt lại mật khẩu Borrow Hub.</p>',
          `<p><a href="${safeResetUrl}">Đặt lại mật khẩu</a>. Liên kết có hiệu lực trong 30 phút.</p>`,
          '<p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>',
        ].join(''),
      });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown mail error';
      this.logger.error(`Password reset email delivery failed: ${message}`);
      return false;
    }
  }

  async sendAccountDeletionConfirmation(
    input: AccountDeletionEmail,
  ): Promise<boolean> {
    if (!this.transporter || !this.fromAddress || !this.accountDeletionUrl) {
      return false;
    }

    const confirmationUrl = new URL(this.accountDeletionUrl);
    confirmationUrl.searchParams.set('token', input.token);
    const safeName = escapeHtml(input.fullName);
    const safeConfirmationUrl = escapeHtml(confirmationUrl.toString());

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        subject: 'Xác nhận xóa tài khoản Borrow Hub',
        text: [
          `Xin chào ${input.fullName},`,
          '',
          'Bạn vừa yêu cầu xóa tài khoản và dữ liệu Borrow Hub.',
          `Xác nhận trong vòng 60 phút tại: ${confirmationUrl.toString()}`,
          '',
          'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.',
        ].join('\n'),
        html: [
          `<p>Xin chào ${safeName},</p>`,
          '<p>Bạn vừa yêu cầu xóa tài khoản và dữ liệu Borrow Hub.</p>',
          `<p><a href="${safeConfirmationUrl}">Xác nhận xóa tài khoản</a>. Liên kết có hiệu lực trong 60 phút.</p>`,
          '<p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>',
        ].join(''),
      });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown mail error';
      this.logger.error(`Account deletion email delivery failed: ${message}`);
      return false;
    }
  }
}
