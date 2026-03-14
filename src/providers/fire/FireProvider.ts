import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Fire Platform Provider
 *
 * Delegates notification delivery to Fire Platform (the SaaS).
 * Fire Platform then distributes to configured channels (Discord, Slack, Email, etc.)
 *
 * @example
 * ```typescript
 * fire.add('fire://fp_live_xyz123@api.fire-platform.io');
 * ```
 */
export class FireProvider extends BaseProvider {
  readonly id = 'fire';
  readonly schemas = ['fire'];

  parseUrl(raw: string) {
    const url = new URL(raw);
    return {
      schema: 'fire',
      hostname: url.hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      username: url.username || undefined,
      password: undefined,
      pathname: url.pathname,
      params: {},
      segments: [],
      raw,
    };
  }

  async send(
    message: FSMessage,
    ctx: FSProviderContext
  ): Promise<FSProviderResult> {
    const { hostname, port, username: apiKey } = ctx.parsed;

    if (!apiKey) {
      return this.failure(new Error('API key is required in URL username'));
    }

    if (!hostname) {
      return this.failure(
        new Error(
          'Invalid fire:// URL: missing host. Use fire://<api_key>@api.fire-platform.io'
        )
      );
    }

    // Auto-detect protocol: localhost/127.0.0.1 uses http, others use https
    const isLocalHost =
      hostname.includes('localhost') || hostname === '127.0.0.1';
    const protocol = isLocalHost ? 'http' : 'https';
    const host = port ? `${hostname}:${port}` : hostname;
    const apiUrl = `${protocol}://${host}/v1/send`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: message.title,
          body: message.body,
          ...(message.actions &&
            message.actions.length > 0 && { actions: message.actions }),
          data: message.metadata,
          audience: ctx.audience,
          segmentId: ctx.segmentId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 401) {
          return this.failure(
            new Error(
              `Fire Platform: Invalid API key (401). Check fire:// key and workspace permissions for host ${host}`
            ),
            {
              status: response.status,
              statusText: response.statusText,
              text: errorText,
            }
          );
        }

        if (response.status === 403) {
          return this.failure(
            new Error(
              `Fire Platform: Access forbidden (403). API key may not have permission to send on host ${host}`
            ),
            {
              status: response.status,
              statusText: response.statusText,
              text: errorText,
            }
          );
        }

        if (response.status === 404) {
          return this.failure(
            new Error(
              `Fire Platform: Endpoint not found (404) on ${host}. Confirm fire:// host is correct and exposes /v1/send`
            ),
            {
              status: response.status,
              statusText: response.statusText,
              text: errorText,
            }
          );
        }

        return this.httpFailure('Fire Platform', response, errorText);
      }

      const data = await response.json();
      return this.success(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (err.message.toLowerCase().includes('fetch failed')) {
        return this.failure(
          new Error(
            `Fire Platform: Unable to reach ${host}. Verify fire:// host, DNS, and network connectivity`
          )
        );
      }

      return this.failure(err);
    }
  }
}
