import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';
import { getHttpErrorDescription } from '../../utils/http-errors';

/**
 * Discord Webhook Provider.
 *
 * URL Format: discord://webhookId/webhookToken
 *
 * Query params:
 *  - avatar_url: URL to avatar image
 *  - username: Bot username
 *  - tts: Text-to-speech (true/false)
 */
export class DiscordWebhookProvider extends BaseProvider {
  readonly id = 'discord';
  readonly schemas = ['discord'];

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
    const webhookId = parsed.hostname;
    const webhookToken = parsed.segments[0];

    if (!webhookId || !webhookToken) {
      return this.failure(
        new Error(
          'Invalid Discord URL. Expected: discord://webhookId/webhookToken'
        )
      );
    }

    const webhookUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
    const payload: Record<string, unknown> = {
      content: this.formatContent(message),
    };

    const avatarUrl = this.getParam(parsed.params.avatar_url);
    const username = this.getParam(parsed.params.username);
    const tts = this.getParam(parsed.params.tts);

    if (avatarUrl) payload.avatar_url = avatarUrl;
    if (username) payload.username = username;
    if (tts === 'true') payload.tts = true;

    try {
      let response: Response;

      // Check if we have attachments
      if (message.attachments && message.attachments.length > 0) {
        // Use multipart form-data for attachments
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(payload));

        for (let i = 0; i < message.attachments.length; i++) {
          const att = message.attachments[i];
          if (!att) continue;

          let blob: Blob;

          if (att.content) {
            // Content provided directly
            const buffer =
              typeof att.content === 'string'
                ? Buffer.from(att.content, 'base64')
                : att.content;
            blob = new Blob([buffer], { type: att.contentType });
          } else if (att.url) {
            // Fetch from URL
            const fetchRes = await fetch(att.url);
            blob = await fetchRes.blob();
          } else {
            continue;
          }

          formData.append(`files[${i}]`, blob, att.name ?? `file${i}`);
        }

        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'User-Agent': 'fire-signal/0.1.0' },
          body: formData,
        });
      } else {
        // No attachments, use JSON
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'fire-signal/0.1.0',
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const errorDetails = text.trim() || response.statusText || '';
        const errorDesc = getHttpErrorDescription(
          response.status,
          errorDetails
        );
        return this.failure(new Error(`Discord: ${errorDesc}`), {
          status: response.status,
          statusText: response.statusText,
          text,
        });
      }

      return this.success({ status: response.status });
    } catch (error) {
      return this.failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private formatContent(message: FSMessage): string {
    if (message.title) return `**${message.title}**\n${message.body}`;
    return message.body;
  }
}
