import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * OneSignal Provider - Push notifications via OneSignal.
 *
 * URL Format (Apprise-compatible):
 *   onesignal://app_id@api_key/
 *   onesignal://template_id:app_id@api_key/
 *   onesignal://app_id@api_key/{player_id}/{player_id2}/
 *   onesignal://app_id@api_key/#{segment}/
 *   onesignal://app_id@api_key/@{user_id}/
 *   onesignal://app_id@api_key/{email}/
 *
 * Path targets:
 *   - {player_id} - Target by OneSignal player ID
 *   - #{segment} - Target by segment (e.g., #Subscribed%20Users)
 *   - @{user_id} - Target by external user ID
 *   - {email} - Target by email address
 *
 * Query params:
 *   - subtitle: Subtitle for iOS
 *   - language: 2-char language code (default: en)
 *   - image: yes/no to include image (default: yes)
 *   - batch: yes/no for batch mode (default: no)
 */
export class OneSignalProvider extends BaseProvider {
  readonly id = 'onesignal';
  readonly schemas = ['onesignal'];

  parseUrl(raw: string): FSParsedUrl {
    const schema = this.extractSchema(raw);
    const afterSchema = raw.slice(`${schema}://`.length);
    const [pathPart, queryPart] = afterSchema.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);

    // Parse template_id:app_id@api_key or app_id@api_key format
    const firstSegment = segments[0] ?? '';
    let templateId: string | undefined;
    let appId: string;
    let apiKey: string | undefined;

    const atIndex = firstSegment.indexOf('@');
    if (atIndex !== -1) {
      const beforeAt = firstSegment.slice(0, atIndex);
      apiKey = firstSegment.slice(atIndex + 1);

      const colonIndex = beforeAt.indexOf(':');
      if (colonIndex !== -1) {
        templateId = beforeAt.slice(0, colonIndex);
        appId = beforeAt.slice(colonIndex + 1);
      } else {
        appId = beforeAt;
      }
    } else {
      appId = firstSegment;
    }

    return {
      schema,
      hostname: appId,
      password: apiKey,
      username: templateId,
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
    const appId = parsed.hostname;
    const apiKey = parsed.password;
    const templateId = parsed.username;

    if (!appId || !apiKey) {
      return this.failure(
        new Error(
          'Invalid OneSignal URL. Expected: onesignal://app_id@api_key/'
        )
      );
    }

    const url = 'https://onesignal.com/api/v1/notifications';

    // Build payload
    const payload: Record<string, unknown> = {
      app_id: appId,
      contents: { en: message.body },
    };

    // Add title if present
    if (message.title) {
      payload.headings = { en: message.title };
    }

    // Add template if specified
    if (templateId) {
      payload.template_id = templateId;
    }

    // Parse path targets: player_ids, #segments, @user_ids, emails
    const playerIds: string[] = [];
    const includeSegments: string[] = [];
    const externalUserIds: string[] = [];
    const emails: string[] = [];

    for (const segment of parsed.segments) {
      if (segment.startsWith('#')) {
        // Segment: #SegmentName
        includeSegments.push(decodeURIComponent(segment.slice(1)));
      } else if (segment.startsWith('@')) {
        // External user ID: @userId
        externalUserIds.push(decodeURIComponent(segment.slice(1)));
      } else if (segment.includes('@')) {
        // Email address
        emails.push(decodeURIComponent(segment));
      } else {
        // Player ID
        playerIds.push(segment);
      }
    }

    // Set targeting based on parsed path
    if (playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    } else if (externalUserIds.length > 0) {
      payload.include_external_user_ids = externalUserIds;
    } else if (emails.length > 0) {
      payload.include_email_tokens = emails;
    } else if (includeSegments.length > 0) {
      payload.included_segments = includeSegments;
    } else {
      // Default to all subscribed users
      payload.included_segments = ['Subscribed Users'];
    }

    // Optional query params
    const subtitle = this.getParam(parsed.params.subtitle);
    const language = this.getParam(parsed.params.language);
    const image = this.getParam(parsed.params.image);

    if (subtitle) {
      payload.subtitle = { en: subtitle };
    }

    if (language && language !== 'en') {
      // Add content in specified language
      (payload.contents as Record<string, string>)[language] = message.body;
      if (message.title) {
        (payload.headings as Record<string, string>)[language] = message.title;
      }
    }

    if (image === 'no') {
      payload.chrome_web_icon = '';
      payload.firefox_icon = '';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
          'User-Agent': 'fire-signal/0.1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return this.httpFailure('OneSignal', response);
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
