import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { BaseProvider, FSProviderContext, FSProviderResult, FSParsedUrl } from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * SMTP Email Provider.
 *
 * URL Format: mailto://user:pass@smtp.example.com:port
 *
 * Query params:
 *  - to: Recipient email(s), comma-separated
 *  - from: Sender email (optional, defaults to user)
 *  - cc: CC recipients
 *  - bcc: BCC recipients
 *  - secure: Use TLS (true/false, default based on port)
 */
export class SmtpProvider extends BaseProvider {
  readonly id = 'smtp';
  readonly schemas = ['mailto', 'mailtos'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');

    let username: string | undefined;
    let password: string | undefined;
    let hostname: string | undefined;
    let port: number | undefined;

    if (pathPart?.includes('@')) {
      const [authPart, hostPart] = pathPart.split('@');
      if (authPart?.includes(':')) {
        const [user, pass] = authPart.split(':');
        username = user ? decodeURIComponent(user) : undefined;
        password = pass ? decodeURIComponent(pass) : undefined;
      } else {
        username = authPart ? decodeURIComponent(authPart) : undefined;
      }

      if (hostPart?.includes(':')) {
        const colonIndex = hostPart.lastIndexOf(':');
        const potentialPort = hostPart.slice(colonIndex + 1);
        if (/^\d+$/.test(potentialPort)) {
          hostname = hostPart.slice(0, colonIndex);
          port = parseInt(potentialPort, 10);
        } else {
          hostname = hostPart;
        }
      } else {
        hostname = hostPart;
      }
    } else {
      hostname = pathPart;
    }

    return {
      schema,
      hostname,
      port,
      username,
      password,
      segments: [],
      path: undefined,
      params: this.parseQueryParams(queryPart ?? ''),
      raw,
    };
  }

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

    const defaultPort = parsed.schema === 'mailtos' ? 465 : 587;
    const port = parsed.port ?? defaultPort;
    const secure = parsed.schema === 'mailtos' || port === 465;

    const transporter: Transporter = nodemailer.createTransport({
      host: parsed.hostname,
      port,
      secure,
      auth:
        parsed.username && parsed.password
          ? { user: parsed.username, pass: parsed.password }
          : undefined,
    });

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
    const escape = (text: string) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');

    if (message.title) {
      return `<h2>${escape(message.title)}</h2><p>${escape(message.body)}</p>`;
    }
    return `<p>${escape(message.body)}</p>`;
  }
}
