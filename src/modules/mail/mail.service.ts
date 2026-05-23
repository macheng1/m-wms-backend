import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendMail(options: SendMailOptions) {
    if (!options.to) {
      this.logger.warn('邮件收件人为空，已跳过发送');
      return false;
    }

    const transporter = this.getTransporter();
    if (!transporter) return false;

    try {
      await transporter.sendMail({
        from: this.getFromAddress(),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${(error as Error).message}`, (error as Error).stack);
      return false;
    }
  }

  private getTransporter() {
    if (this.transporter) return this.transporter;

    const host = this.configService.get<string>('nodemailer_host');
    const port = Number(this.configService.get<string>('nodemailer_port') || 587);
    const user = this.configService.get<string>('nodemailer_auth_user');
    const pass = this.configService.get<string>('nodemailer_auth_pass');

    if (!host || !user || !pass) {
      this.logger.warn('nodemailer 配置不完整，邮件发送已跳过');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  private getFromAddress() {
    const user = this.configService.get<string>('nodemailer_auth_user');
    return `"WMS 平台" <${user}>`;
  }
}
