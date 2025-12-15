import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Microsoft Teams Provider - Incoming webhooks.
 *
 * URL Format: msteams://WEBHOOK_URL_ENCODED or the full webhook URL
 *
 * MS Teams webhook URLs look like:
 * https://tenant.webhook.office.com/webhookb2/GUID@GUID/IncomingWebhook/GUID/GUID
 *
 * Convert to fire-signal format:
 * msteams://tenant.webhook.office.com/webhookb2/GUID@GUID/IncomingWebhook/GUID/GUID
 *
 * Query params:
 *  - theme_color: Hex color for the message card (without #)
 */
export class MSTeamsProvider extends BaseProvider {
  readonly id = 'msteams';
  readonly schemas = ['msteams'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    let hostname = segments[0] ?? '';
    let port: number | undefined;

    // Handle port in hostname
    const colonIndex = hostname.lastIndexOf(':');
    if (colonIndex !== -1) {
      const potentialPort = hostname.slice(colonIndex + 1);
      if (/^\d+$/.test(potentialPort)) {
        port = parseInt(potentialPort, 10);
        hostname = hostname.slice(0, colonIndex);
      }
    }

    return {
      schema,
      hostname,
      port,
      segments: segments.slice(1),
      path: segments.slice(1).join('/'),
      params: this.parseQueryParams(queryPart ?? ''),
      raw,
    };
  }

  async send(
    message: FSMessage,
    ctx: FSProviderContext
  ): Promise<FSProviderResult> {
    const { parsed } = ctx;

    if (!parsed.hostname) {
      return this.failure(
        new Error('Invalid MS Teams URL. Expected: msteams://host/webhook-path')
      );
    }

    // Reconstruct the webhook URL
    const port = parsed.port ? `:${parsed.port}` : '';
    const path = parsed.path ? `/${parsed.path}` : '';
    const url = `https://${parsed.hostname}${port}${path}`;

    // Build MessageCard payload
    const themeColor = this.getParam(parsed.params.theme_color) ?? '0076D7';

    const payload: Record<string, unknown> = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: message.title ?? message.body.substring(0, 50),
      sections: [
        {
          activityTitle: message.title ?? 'Fire-Signal',
          text: message.body,
          markdown: true,
        },
      ],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'fire-signal/0.1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return this.httpFailure('MS Teams', response);
      }

      const responseData = await response.text().catch(() => '');
      return this.success(responseData);
    } catch (error) {
      return this.failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
