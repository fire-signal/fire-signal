/**
 * Discord Webhook Provider.
 *
 * URL Format: discord://webhookId/webhookToken
 * Query params:
 *   - avatar_url: URL to avatar image
 *   - username: Bot username
 *   - tts: Text-to-speech (true/false)
 */

import { BaseProvider, FSProviderContext, FSProviderResult } from '../base/Provider';
import { FSMessage } from '../../core/Message';

export class DiscordWebhookProvider extends BaseProvider {
  readonly id = 'discord';
  readonly schemas = ['discord'];

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;

    // URL format: discord://webhookId/webhookToken
    const webhookId = parsed.hostname;
    const webhookToken = parsed.segments[0];

    if (!webhookId || !webhookToken) {
      return this.failure(
        new Error('Invalid Discord URL. Expected: discord://webhookId/webhookToken')
      );
    }

    const webhookUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;

    // Build Discord payload
    const payload: Record<string, unknown> = {
      content: this.formatContent(message),
    };

    // Optional params
    const avatarUrl = this.getParam(parsed.params.avatar_url);
    const username = this.getParam(parsed.params.username);
    const tts = this.getParam(parsed.params.tts);

    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (username) payload.username = username;
    if (tts === 'true') payload.tts = true;

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
        return this.failure(new Error(`Discord API error ${response.status}: ${text}`), {
          status: response.status,
          text,
        });
      }

      // Discord returns 204 No Content on success
      return this.success({ status: response.status });
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private formatContent(message: FSMessage): string {
    if (message.title) {
      return `**${message.title}**\n${message.body}`;
    }
    return message.body;
  }

  private getParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
