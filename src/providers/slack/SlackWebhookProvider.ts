import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';
import { getHttpErrorDescription } from '../../utils/http-errors';

/**
 * Slack Webhook Provider.
 *
 * URL Format: slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
 *
 * Query params:
 *  - channel: Channel to post to (e.g., #general or @username)
 *  - username: Bot username
 *  - icon_emoji: Emoji to use as icon (e.g., :robot:)
 *  - icon_url: URL to icon image
 */
export class SlackWebhookProvider extends BaseProvider {
  readonly id = 'slack';
  readonly schemas = ['slack'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    return {
      schema,
      hostname: segments[0],
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
    const hookParts = [parsed.hostname, ...parsed.segments].filter(Boolean);

    if (hookParts.length < 3) {
      return this.failure(
        new Error('Invalid Slack URL. Expected: slack://T.../B.../XXX')
      );
    }

    let webhookUrl: string;
    if (parsed.hostname === 'hooks.slack.com') {
      webhookUrl = `https://hooks.slack.com/${parsed.path || ''}`;
    } else {
      webhookUrl = `https://hooks.slack.com/services/${hookParts.join('/')}`;
    }

    const payload: Record<string, unknown> = {
      text: this.formatContent(message),
    };

    const channel = this.getParam(parsed.params.channel);
    const username = this.getParam(parsed.params.username);
    const iconEmoji = this.getParam(parsed.params.icon_emoji);
    const iconUrl = this.getParam(parsed.params.icon_url);

    if (channel) payload.channel = channel;
    if (username) payload.username = username;
    if (iconEmoji) payload.icon_emoji = iconEmoji;
    if (iconUrl) payload.icon_url = iconUrl;

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
        const errorDetails = text.trim() || response.statusText || '';
        const errorDesc = getHttpErrorDescription(
          response.status,
          errorDetails
        );
        return this.failure(new Error(`Slack: ${errorDesc}`), {
          status: response.status,
          statusText: response.statusText,
          text,
        });
      }

      const text = await response.text();
      return this.success({ response: text });
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
