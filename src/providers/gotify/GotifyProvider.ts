import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Gotify Provider - Self-hosted push notifications.
 *
 * URL Format: gotify://host/token or gotifys://host/token (HTTPS)
 *
 * Query params:
 *  - priority: Message priority (1-10, default 5)
 */
export class GotifyProvider extends BaseProvider {
  readonly id = 'gotify';
  readonly schemas = ['gotify', 'gotifys'];

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
        new Error('Invalid Gotify URL. Expected: gotify://host/token')
      );
    }

    // Token can be in path or as first segment
    const token = parsed.segments[0] || parsed.path;
    if (!token) {
      return this.failure(
        new Error('Invalid Gotify URL. Token is required: gotify://host/token')
      );
    }

    const protocol = parsed.schema === 'gotifys' ? 'https' : 'http';
    const port = parsed.port ? `:${parsed.port}` : '';

    // If there's a path after the token, include it
    const remainingPath = parsed.segments.slice(1).join('/');
    const basePath = remainingPath ? `/${remainingPath}` : '';
    const url = `${protocol}://${parsed.hostname}${port}${basePath}/message?token=${token}`;

    const priority = this.getParam(parsed.params.priority);

    // Build form data (Gotify expects form-urlencoded, not JSON)
    const formData = new URLSearchParams();
    formData.append('message', message.body);

    if (message.title) {
      formData.append('title', message.title);
    }

    if (priority) {
      formData.append('priority', priority);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'fire-signal/0.1.0',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        return this.httpFailure('Gotify', response);
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
