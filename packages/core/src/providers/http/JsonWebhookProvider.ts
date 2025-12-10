/**
 * JSON Webhook Provider - Generic JSON POST webhook.
 *
 * URL Format: json://hostname/path
 * Query params:
 *   - method: HTTP method (default: POST)
 *   - content_type: Content-Type header (default: application/json)
 */

import { BaseProvider, FSProviderContext, FSProviderResult } from '../base/Provider';
import { FSMessage } from '../../core/Message';

export class JsonWebhookProvider extends BaseProvider {
  readonly id = 'json';
  readonly schemas = ['json', 'jsons'];

  async send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult> {
    const { parsed } = ctx;
    const method = this.getParam(parsed.params.method) ?? 'POST';
    const contentType = this.getParam(parsed.params.content_type) ?? 'application/json';

    // Build the actual URL
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
        headers: {
          'Content-Type': contentType,
          'User-Agent': 'fire-signal/0.1.0',
        },
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

  private getParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
