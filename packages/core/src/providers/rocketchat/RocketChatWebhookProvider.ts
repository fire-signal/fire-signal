/**
 * Rocket.Chat Webhook Provider.
 *
 * URL Format: rocketchat://hostname/webhookToken
 * Query params:
 *   - channel: Channel to post to (e.g., #general or @username)
 *   - alias: Bot alias/username
 *   - avatar: URL to avatar image
 *   - emoji: Emoji to use as avatar (e.g., :rocket:)
 */

import { BaseProvider, FSProviderContext, FSProviderResult } from '../base/Provider';
import { FSMessage } from '../../core/Message';

export class RocketChatWebhookProvider extends BaseProvider {
  readonly id = 'rocketchat';
  readonly schemas = ['rocketchat', 'rocket'];

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;

    // URL format: rocketchat://hostname/webhookToken
    // or rocketchat://hostname:port/path/to/webhook
    if (!parsed.hostname) {
      return this.failure(
        new Error('Invalid Rocket.Chat URL. Expected: rocketchat://hostname/webhookToken')
      );
    }

    const port = parsed.port ? `:${parsed.port}` : '';
    const path = parsed.path || '';
    const webhookUrl = `https://${parsed.hostname}${port}/hooks/${path}`;

    // Build Rocket.Chat payload
    const payload: Record<string, unknown> = {
      text: this.formatContent(message),
    };

    // Optional params
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
        return this.failure(new Error(`Rocket.Chat API error ${response.status}: ${text}`), {
          status: response.status,
          text,
        });
      }

      const responseData = await response.json().catch(() => ({}));
      return this.success(responseData);
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private formatContent(message: FSMessage): string {
    if (message.title) {
      return `*${message.title}*\n${message.body}`;
    }
    return message.body;
  }

  private getParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
