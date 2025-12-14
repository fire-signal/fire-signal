import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';

/**
 * Telegram Bot Provider.
 *
 * URL Format: tgram://botToken/chatId
 *
 * Query params:
 *  - parse_mode: Message format (HTML, Markdown, MarkdownV2)
 *  - disable_web_page_preview: Disable link previews (true/false)
 *  - disable_notification: Send silently (true/false)
 */
export class TelegramBotProvider extends BaseProvider {
  readonly id = 'telegram';
  readonly schemas = ['tgram', 'telegram'];

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
    const botToken = parsed.hostname;
    const chatId = parsed.segments[0];

    if (!botToken || !chatId) {
      return this.failure(
        new Error('Invalid Telegram URL. Expected: tgram://botToken/chatId')
      );
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: this.formatContent(message),
    };

    const parseMode = this.getParam(parsed.params.parse_mode);
    const disablePreview = this.getParam(
      parsed.params.disable_web_page_preview
    );
    const disableNotification = this.getParam(
      parsed.params.disable_notification
    );

    if (parseMode) payload.parse_mode = parseMode;
    if (disablePreview === 'true') payload.disable_web_page_preview = true;
    if (disableNotification === 'true') payload.disable_notification = true;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'fire-signal/0.1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseData = (await response.json()) as Record<string, unknown>;

      if (!response.ok || responseData.ok !== true) {
        return this.failure(
          new Error(`Telegram API error: ${JSON.stringify(responseData)}`),
          responseData
        );
      }

      return this.success(responseData);
    } catch (error) {
      return this.failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private formatContent(message: FSMessage): string {
    if (message.title) return `*${message.title}*\n\n${message.body}`;
    return message.body;
  }
}
