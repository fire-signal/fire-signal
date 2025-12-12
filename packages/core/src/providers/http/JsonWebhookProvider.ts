import { BaseProvider, FSProviderContext, FSProviderResult, FSParsedUrl } from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * JSON Webhook Provider - Generic JSON POST webhook.
 *
 * URL Format: json://hostname/path or jsons://hostname/path (HTTPS)
 *
 * Query params:
 *  - method: HTTP method (default: POST)
 *  - content_type: Content-Type header (default: application/json)
 */
export class JsonWebhookProvider extends BaseProvider {
  readonly id = 'json';
  readonly schemas = ['json', 'jsons'];

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

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;
    const method = this.getParam(parsed.params.method) ?? 'POST';
    const contentType = this.getParam(parsed.params.content_type) ?? 'application/json';

    const protocol = parsed.schema === 'jsons' ? 'https' : 'http';
    const port = parsed.port ? `:${parsed.port}` : '';
    const path = parsed.path ? `/${parsed.path}` : '';
    const url = `${protocol}://${parsed.hostname}${port}${path}`;

    const body = JSON.stringify({
      title: message.title,
      body: message.body,
      tags: message.tags,
      metadata: message.metadata,
    });

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': contentType, 'User-Agent': 'fire-signal/0.1.0' },
        body,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return this.failure(
          new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`),
          { status: response.status, text }
        );
      }

      const responseData = await response.json().catch(() => ({}));
      return this.success(responseData);
    } catch (error) {
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
