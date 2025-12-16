import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Pushover Provider - Push notifications via Pushover.
 *
 * URL Format:
 *   pover://user_key@api_token/
 *   pover://user_key@api_token/{device}/
 *   pover://user_key@api_token/{device1}/{device2}/
 *
 * Path targets:
 *   - {device} - Target specific device(s)
 *
 * Query params:
 *   - priority: -2 (lowest) to 2 (emergency)
 *   - sound: Notification sound
 *   - url: Supplementary URL
 *   - url_title: Title for the URL
 *   - html: yes/no for HTML formatting
 *   - ttl: Time to live in seconds
 */
export class PushoverProvider extends BaseProvider {
  readonly id = 'pushover';
  readonly schemas = ['pover', 'pushover'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    // Parse user_key@api_token format
    const firstSegment = segments[0] ?? '';
    let userKey = firstSegment;
    let apiToken: string | undefined;

    const atIndex = firstSegment.indexOf('@');
    if (atIndex !== -1) {
      userKey = firstSegment.slice(0, atIndex);
      apiToken = firstSegment.slice(atIndex + 1);
    }

    return {
      schema,
      hostname: userKey,
      password: apiToken,
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
    const userKey = parsed.hostname;
    const apiToken = parsed.password;

    if (!userKey || !apiToken) {
      return this.failure(
        new Error('Invalid Pushover URL. Expected: pover://user_key@api_token/')
      );
    }

    const url = 'https://api.pushover.net/1/messages.json';

    // Build form data
    const formData = new URLSearchParams();
    formData.append('token', apiToken);
    formData.append('user', userKey);
    formData.append('message', message.body);

    if (message.title) {
      formData.append('title', message.title);
    }

    // Add devices from path
    if (parsed.segments.length > 0) {
      formData.append('device', parsed.segments.join(','));
    }

    // Optional query params
    const priority = this.getParam(parsed.params.priority);
    const sound = this.getParam(parsed.params.sound);
    const urlParam = this.getParam(parsed.params.url);
    const urlTitle = this.getParam(parsed.params.url_title);
    const html = this.getParam(parsed.params.html);
    const ttl = this.getParam(parsed.params.ttl);

    if (priority) formData.append('priority', priority);
    if (sound) formData.append('sound', sound);
    if (urlParam) formData.append('url', urlParam);
    if (urlTitle) formData.append('url_title', urlTitle);
    if (html === 'yes') formData.append('html', '1');
    if (ttl) formData.append('ttl', ttl);

    // Emergency priority requires retry/expire
    if (priority === '2') {
      formData.append('retry', '30');
      formData.append('expire', '3600');
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
        return this.httpFailure('Pushover', response);
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
