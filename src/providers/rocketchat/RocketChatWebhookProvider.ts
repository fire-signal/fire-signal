import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Rocket.Chat Webhook Provider.
 *
 * URL Format: rocketchat://hostname/webhookToken
 *
 * Query params:
 *  - channel: Channel to post to (e.g., #general or @username)
 *  - alias: Bot alias/username
 *  - avatar: URL to avatar image
 *  - emoji: Emoji to use as avatar (e.g., :rocket:)
 */
export class RocketChatWebhookProvider extends BaseProvider {
  readonly id = 'rocketchat';
  readonly schemas = ['rocketchat', 'rocket'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    const firstSegment = segments[0] ?? '';
    let hostname = firstSegment;
    let port: number | undefined;

    const colonIndex = firstSegment.lastIndexOf(':');
    if (colonIndex !== -1) {
      const potentialPort = firstSegment.slice(colonIndex + 1);
      if (/^\d+$/.test(potentialPort)) {
        hostname = firstSegment.slice(0, colonIndex);
        port = parseInt(potentialPort, 10);
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
        new Error(
          'Invalid Rocket.Chat URL. Expected: rocketchat://hostname/webhookToken'
        )
      );
    }

    const port = parsed.port ? `:${parsed.port}` : '';
    const path = parsed.path || '';
    const webhookUrl = `https://${parsed.hostname}${port}/hooks/${path}`;

    const payload: Record<string, unknown> = {
      text: this.formatContent(message),
    };

    const channel = this.getParam(parsed.params.channel);
    const alias = this.getParam(parsed.params.alias);
    const avatar = this.getParam(parsed.params.avatar);
    const emoji = this.getParam(parsed.params.emoji);

    if (channel) payload.channel = channel;
    if (alias) payload.alias = alias;
    if (avatar) payload.avatar = avatar;
    if (emoji) payload.emoji = emoji;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'fire-signal/0.1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return this.failure(
          new Error(`Rocket.Chat API error ${response.status}: ${text}`),
          {
            status: response.status,
            text,
          }
        );
      }

      const responseData = await response.json().catch(() => ({}));
      return this.success(responseData);
    } catch (error) {
      return this.failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private formatContent(message: FSMessage): string {
    if (message.title) return `*${message.title}*\n${message.body}`;
    return message.body;
  }
}
