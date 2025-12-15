import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Mattermost Provider - Incoming webhooks.
 *
 * URL Format: mmost://host/hook_id or mmosts://host/hook_id (HTTPS)
 *
 * The webhook URL from Mattermost is:
 * https://mattermost.example.com/hooks/HOOK_ID
 *
 * Convert to fire-signal format:
 * mmosts://mattermost.example.com/HOOK_ID
 *
 * Query params:
 *  - channel: Override the default channel (e.g., #general, @username)
 *  - username: Override the webhook username
 *  - icon_url: Override the webhook icon
 */
export class MattermostProvider extends BaseProvider {
  readonly id = 'mattermost';
  readonly schemas = ['mmost', 'mmosts'];

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
        new Error('Invalid Mattermost URL. Expected: mmost://host/hook_id')
      );
    }

    const hookId = parsed.segments[0] || parsed.path;
    if (!hookId) {
      return this.failure(
        new Error(
          'Invalid Mattermost URL. Hook ID is required: mmost://host/hook_id'
        )
      );
    }

    const protocol = parsed.schema === 'mmosts' ? 'https' : 'http';
    const port = parsed.port ? `:${parsed.port}` : '';
    const url = `${protocol}://${parsed.hostname}${port}/hooks/${hookId}`;

    // Build message text with optional title (markdown)
    const text = message.title
      ? `**${message.title}**\n${message.body}`
      : message.body;

    const payload: Record<string, unknown> = { text };

    // Optional overrides from query params
    const channel = this.getParam(parsed.params.channel);
    const username = this.getParam(parsed.params.username);
    const iconUrl = this.getParam(parsed.params.icon_url);

    if (channel) payload.channel = channel;
    if (username) payload.username = username;
    if (iconUrl) payload.icon_url = iconUrl;

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
        return this.httpFailure('Mattermost', response);
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
