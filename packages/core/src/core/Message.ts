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
   * Tags for filtering which URLs should receive this message.
   * If specified, only URLs with matching tags will be used.
   */
  tags?: string[];

  /**
   * Additional metadata that providers can use for custom behavior.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Represents an attachment to be sent with a notification.
 */
export interface FSAttachment {
  /**
   * URL to the attachment. Can be:
   * - http(s):// for remote files
   * - file:// for local files
   */
  url: string;

  /**
   * Optional display name for the attachment.
   */
  name?: string;

  /**
   * Optional MIME type of the attachment.
   */
  contentType?: string;
}
