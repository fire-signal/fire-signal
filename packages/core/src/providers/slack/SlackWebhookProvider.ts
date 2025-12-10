/**
 * Slack Webhook Provider.
 *
 * URL Format: slack://hookPath/hookToken1/hookToken2
 * Or simpler: slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
 *
 * Query params:
 *   - channel: Channel to post to (e.g., #general or @username)
 *   - username: Bot username
 *   - icon_emoji: Emoji to use as icon (e.g., :robot:)
 *   - icon_url: URL to icon image
 */

import { BaseProvider, FSProviderContext, FSProviderResult } from '../base/Provider';
import { FSMessage } from '../../core/Message';

export class SlackWebhookProvider extends BaseProvider {
  readonly id = 'slack';
  readonly schemas = ['slack'];

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;

    // URL format: slack://hookPath/token1/token2
    // Example: slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    const hookParts = [parsed.hostname, ...parsed.segments].filter(Boolean);

    if (hookParts.length < 3) {
      return this.failure(
        new Error(
          'Invalid Slack URL. Expected: slack://T.../B.../XXX or slack://hooks.slack.com/services/T.../B.../XXX'
        )
      );
    }

    // Handle both formats:
    // 1. slack://T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    // 2. slack://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
    let webhookUrl: string;
    if (parsed.hostname === 'hooks.slack.com') {
      const path = parsed.path || '';
      webhookUrl = `https://hooks.slack.com/${path}`;
    } else {
      webhookUrl = `https://hooks.slack.com/services/${hookParts.join('/')}`;
    }

    // Build Slack payload
    const payload: Record<string, unknown> = {
      text: this.formatContent(message),
    };

    // Optional params
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
        return this.failure(new Error(`Slack API error ${response.status}: ${text}`), {
          status: response.status,
          text,
        });
      }

      // Slack returns 'ok' as text on success
      const text = await response.text();
      return this.success({ response: text });
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
