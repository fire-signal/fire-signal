/**
 * SMTP Email Provider.
 *
 * URL Format: mailto://user:pass@smtp.example.com:port
 * Query params:
 *   - to: Recipient email(s), comma-separated
 *   - from: Sender email (optional, defaults to user)
 *   - cc: CC recipients
 *   - bcc: BCC recipients
 *   - secure: Use TLS (true/false, default based on port)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { BaseProvider, FSProviderContext, FSProviderResult } from '../base/Provider';
import { FSMessage } from '../../core/Message';

export class SmtpProvider extends BaseProvider {
  readonly id = 'smtp';
  readonly schemas = ['mailto', 'mailtos'];

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;

    if (!parsed.hostname) {
      return this.failure(
        new Error('Invalid mailto URL. Expected: mailto://user:pass@smtp.example.com')
      );
    }

    const to = this.getParam(parsed.params.to);
    if (!to) {
      return this.failure(new Error('Missing "to" parameter in mailto URL'));
    }

    // Determine port and security
    const defaultPort = parsed.schema === 'mailtos' ? 465 : 587;
    const port = parsed.port ?? defaultPort;
    const secure = parsed.schema === 'mailtos' || port === 465;

    // Create transporter
    const transporter: Transporter = nodemailer.createTransport({
      host: parsed.hostname,
      port,
      secure,
      auth:
        parsed.username && parsed.password
          ? {
              user: parsed.username,
              pass: parsed.password,
            }
          : undefined,
    });

    // Build email options
    const from =
      this.getParam(parsed.params.from) ?? parsed.username ?? 'noreply@fire-signal.local';
    const cc = this.getParam(parsed.params.cc);
    const bcc = this.getParam(parsed.params.bcc);

    const mailOptions = {
      from,
      to,
      cc,
      bcc,
      subject: message.title ?? 'Notification from Fire-Signal',
      text: message.body,
      html: this.formatHtml(message),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return this.success({
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private formatHtml(message: FSMessage): string {
    if (message.title) {
      return `<h2>${this.escapeHtml(message.title)}</h2><p>${this.escapeHtml(message.body)}</p>`;
    }
    return `<p>${this.escapeHtml(message.body)}</p>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  private getParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
