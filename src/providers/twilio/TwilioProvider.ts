import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Twilio Provider - SMS and WhatsApp messages via Twilio.
 *
 * URL Format:
 *   twilio://AccountSID:AuthToken@FromPhone/ToPhone
 *   twilio://AccountSID:AuthToken@FromPhone/ToPhone1/ToPhone2
 *   twilio://AccountSID:AuthToken@FromPhone/w:ToWhatsApp
 *
 * Phone numbers must include country code (e.g., +5511999999999)
 * WhatsApp recipients use w: prefix (e.g., w:+5511999999999)
 */
export class TwilioProvider extends BaseProvider {
  readonly id = 'twilio';
  readonly schemas = ['twilio'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');

    // Parse AccountSID:AuthToken@FromPhone/ToPhones
    const atIndex = (pathPart ?? '').lastIndexOf('@');
    if (atIndex === -1) {
      return {
        schema,
        hostname: '',
        segments: [],
        path: '',
        params: {},
        raw,
      };
    }

    const credentials = (pathPart ?? '').slice(0, atIndex);
    const phonePart = (pathPart ?? '').slice(atIndex + 1);

    const colonIndex = credentials.indexOf(':');
    const accountSid =
      colonIndex !== -1 ? credentials.slice(0, colonIndex) : credentials;
    const authToken =
      colonIndex !== -1 ? credentials.slice(colonIndex + 1) : '';

    const phoneSegments = phonePart.split('/').filter(Boolean);
    const fromPhone = phoneSegments[0] ?? '';
    const toPhones = phoneSegments.slice(1);

    return {
      schema,
      hostname: fromPhone,
      username: accountSid,
      password: authToken,
      segments: toPhones,
      path: toPhones.join('/'),
      params: this.parseQueryParams(queryPart ?? ''),
      raw,
    };
  }

  async send(
    message: FSMessage,
    ctx: FSProviderContext
  ): Promise<FSProviderResult> {
    const { parsed } = ctx;
    const accountSid = parsed.username;
    const authToken = parsed.password;
    const fromPhone = parsed.hostname;
    const toPhones = parsed.segments;

    if (!accountSid || !authToken || !fromPhone) {
      return this.failure(
        new Error(
          'Invalid Twilio URL. Expected: twilio://AccountSID:AuthToken@FromPhone/ToPhone'
        )
      );
    }

    if (toPhones.length === 0) {
      return this.failure(
        new Error('At least one recipient phone is required')
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
      'base64'
    );

    const results: Array<{ to: string; success: boolean; error?: string }> = [];

    for (const toPhone of toPhones) {
      // Determine if WhatsApp (w: prefix)
      const isWhatsApp = toPhone.startsWith('w:');
      const actualToPhone = isWhatsApp ? toPhone.slice(2) : toPhone;
      const from = isWhatsApp ? `whatsapp:${fromPhone}` : fromPhone;
      const to = isWhatsApp ? `whatsapp:${actualToPhone}` : actualToPhone;

      const formData = new URLSearchParams();
      formData.append('From', from);
      formData.append('To', to);
      formData.append('Body', message.body);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authHeader}`,
            'User-Agent': 'fire-signal/0.1.0',
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          results.push({
            to: actualToPhone,
            success: false,
            error:
              (errorData as Record<string, string>).message ??
              `HTTP ${response.status}`,
          });
        } else {
          results.push({ to: actualToPhone, success: true });
        }
      } catch (error) {
        results.push({
          to: actualToPhone,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const failures = results.filter((r) => !r.success);

    if (!allSuccess) {
      return this.failure(
        new Error(
          `Failed to send to: ${failures.map((f) => `${f.to} (${f.error})`).join(', ')}`
        )
      );
    }

    return this.success({ sent: results.length, recipients: toPhones });
  }
}
