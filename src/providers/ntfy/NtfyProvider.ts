import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * ntfy Provider - Self-hosted push notifications.
 *
 * URL Format: ntfy://host/topic or ntfys://host/topic (HTTPS)
 *
 * Query params:
 *  - priority: Message priority (min, low, default, high, urgent)
 *  - tags: Comma-separated emoji tags (e.g., warning,skull)
 *  - click: URL to open when notification is clicked
 *  - attach: URL of attachment
 *  - icon: URL of notification icon
 *  - email: Email address for email notifications
 *  - delay: Delay before sending (e.g., 30min, 2h)
 */
export class NtfyProvider extends BaseProvider {
  readonly id = 'ntfy';
  readonly schemas = ['ntfy', 'ntfys'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    // Handle user:pass@host format
    const firstSegment = segments[0] ?? '';
    let hostname = firstSegment;
    let username: string | undefined;
    let password: string | undefined;
    let port: number | undefined;

    const atIndex = firstSegment.lastIndexOf('@');
    if (atIndex !== -1) {
      const userPass = firstSegment.slice(0, atIndex);
      const hostPort = firstSegment.slice(atIndex + 1);
      const colonIndex = userPass.indexOf(':');
      if (colonIndex !== -1) {
        username = userPass.slice(0, colonIndex);
        password = userPass.slice(colonIndex + 1);
      } else {
        username = userPass;
      }
      hostname = hostPort;
    }

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
      username,
      password,
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
        new Error('Invalid ntfy URL. Expected: ntfy://host/topic')
      );
    }

    const topic = parsed.segments[0] || parsed.path;
    if (!topic) {
      return this.failure(
        new Error('Invalid ntfy URL. Topic is required: ntfy://host/topic')
      );
    }

    const protocol = parsed.schema === 'ntfys' ? 'https' : 'http';
    const port = parsed.port ? `:${parsed.port}` : '';
    const url = `${protocol}://${parsed.hostname}${port}/${topic}`;

    const headers: Record<string, string> = {
      'User-Agent': 'fire-signal/0.1.0',
    };

    // Add title if present
    if (message.title) {
      headers['Title'] = message.title;
    }

    // Add optional headers from query params
    const priority = this.getParam(parsed.params.priority);
    const tags = this.getParam(parsed.params.tags);
    const click = this.getParam(parsed.params.click);
    const attach = this.getParam(parsed.params.attach);
    const icon = this.getParam(parsed.params.icon);
    const email = this.getParam(parsed.params.email);
    const delay = this.getParam(parsed.params.delay);

    if (priority) headers['Priority'] = priority;
    if (tags) headers['Tags'] = tags;
    if (click) headers['Click'] = click;
    if (attach) headers['Attach'] = attach;
    if (icon) headers['Icon'] = icon;
    if (email) headers['Email'] = email;
    if (delay) headers['Delay'] = delay;

    // Add basic auth if credentials provided
    if (parsed.username && parsed.password) {
      const auth = Buffer.from(
        `${parsed.username}:${parsed.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: message.body,
      });

      if (!response.ok) {
        return this.httpFailure('ntfy', response);
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
