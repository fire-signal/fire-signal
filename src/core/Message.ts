/**
 * Represents a notification message to be sent through fire-signal.
 */
export interface FSMessage {
  /**
   * Title/subject of the notification.
   * Not all providers support titles (e.g., some webhooks may ignore it).
   */
  title?: string;

  /**
   * Main body/content of the notification.
   * This is the only required field.
   */
  body: string;

  /**
   * Optional attachments to include with the notification.
   */
  attachments?: FSAttachment[];

  /**
   * Interactive actions (buttons) to display with the message.
   * Note: Support varies by provider.
   */
  actions?: FSAction[];

  /**
   * Additional metadata that providers can use for custom behavior.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Represents an interactive action (button).
 */
export interface FSAction {
  /** Label text to display on the button. */
  label: string;

  /** URL to open when clicked. */
  url: string;

  /** Visual style of the button. @default 'secondary' */
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Represents an attachment to be sent with a notification.
 *
 * @example
 * ```typescript
 * // Using URL
 * { url: 'https://example.com/file.pdf', name: 'report.pdf' }
 *
 * // Using Buffer content
 * { content: fs.readFileSync('./file.pdf'), name: 'report.pdf' }
 *
 * // Using base64 string
 * { content: 'base64string...', name: 'image.png', contentType: 'image/png' }
 * ```
 */
export interface FSAttachment {
  /**
   * URL to the attachment (http, https, or file://).
   * Either url or content must be provided.
   */
  url?: string;

  /**
   * File content as Buffer or base64 string.
   * Either url or content must be provided.
   */
  content?: Buffer | string;

  /**
   * Display name for the attachment (required for content, optional for url).
   */
  name?: string;

  /**
   * MIME type of the attachment (e.g., 'application/pdf', 'image/png').
   */
  contentType?: string;
}
