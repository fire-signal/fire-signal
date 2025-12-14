import {
  BaseProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from '../base/Provider';
import type { FSMessage } from '../../core/Message';
import { getHttpErrorDescription } from '../../utils/http-errors';

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

    const parseMode = this.getParam(parsed.params.parse_mode);
    const disablePreview = this.getParam(
      parsed.params.disable_web_page_preview
    );
    const disableNotification = this.getParam(
      parsed.params.disable_notification
    );

    try {
      // Send attachments first if present
      if (message.attachments && message.attachments.length > 0) {
        for (const att of message.attachments) {
          if (!att) continue;

          const docUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
          const formData = new FormData();
          formData.append('chat_id', chatId);

          if (att.content) {
            const buffer =
              typeof att.content === 'string'
                ? Buffer.from(att.content, 'base64')
                : att.content;
            const blob = new Blob([buffer], { type: att.contentType });
            formData.append('document', blob, att.name ?? 'file');
          } else if (att.url) {
            // Telegram can fetch URLs directly
            formData.append('document', att.url);
          } else {
            continue;
          }

          if (disableNotification === 'true') {
            formData.append('disable_notification', 'true');
          }

          await fetch(docUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'fire-signal/0.1.0' },
            body: formData,
          });
        }
      }

      // Send the text message
      const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text: this.formatContent(message),
      };

      if (parseMode) payload.parse_mode = parseMode;
      if (disablePreview === 'true') payload.disable_web_page_preview = true;
      if (disableNotification === 'true') payload.disable_notification = true;

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
        const errorDesc = getHttpErrorDescription(
          response.status,
          JSON.stringify(responseData)
        );
        return this.failure(new Error(`Telegram: ${errorDesc}`), responseData);
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
