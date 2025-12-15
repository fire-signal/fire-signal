import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Google Chat Provider - Workspace chat via webhooks.
 *
 * URL Format: gchat://chat.googleapis.com/v1/spaces/SPACE/messages?key=KEY&token=TOKEN
 *
 * The webhook URL from Google Chat is:
 * https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
 *
 * Convert to fire-signal format:
 * gchat://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
 *
 * Or simpler (just the webhook path after the host):
 * gchat://SPACE_ID/KEY/TOKEN
 */
export class GoogleChatProvider extends BaseProvider {
  readonly id = 'gchat';
  readonly schemas = ['gchat', 'googlechat'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    return {
      schema,
      hostname: segments[0],
      segments: segments.slice(1),
      path: segments.join('/'),
      params: this.parseQueryParams(queryPart ?? ''),
      raw,
    };
  }

  async send(
    message: FSMessage,
    ctx: FSProviderContext
  ): Promise<FSProviderResult> {
    const { parsed } = ctx;

    // Build webhook URL
    let webhookUrl: string;

    // Check if it's the full URL format (chat.googleapis.com/v1/spaces/...)
    if (parsed.hostname === 'chat.googleapis.com') {
      const key = this.getParam(parsed.params.key);
      const token = this.getParam(parsed.params.token);

      if (!key || !token) {
        return this.failure(
          new Error(
            'Invalid Google Chat URL. key and token params are required.'
          )
        );
      }

      webhookUrl = `https://chat.googleapis.com/${parsed.segments.join('/')}?key=${key}&token=${token}`;
    } else {
      // Simplified format: gchat://SPACE_ID/KEY/TOKEN
      const [spaceId, key, token] = [
        parsed.hostname,
        parsed.segments[0],
        parsed.segments[1],
      ];

      if (!spaceId || !key || !token) {
        return this.failure(
          new Error(
            'Invalid Google Chat URL. Expected: gchat://SPACE_ID/KEY/TOKEN'
          )
        );
      }

      webhookUrl = `https://chat.googleapis.com/v1/spaces/${spaceId}/messages?key=${key}&token=${token}`;
    }

    // Build message payload
    const text = message.title
      ? `*${message.title}*\n${message.body}`
      : message.body;

    const payload: Record<string, unknown> = { text };

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
        return this.httpFailure('Google Chat', response);
      }

      const responseData = await response.json().catch(() => ({}));
      return this.success(responseData);
    } catch (error) {
      return this.failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
