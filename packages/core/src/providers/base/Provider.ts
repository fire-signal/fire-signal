import { FSMessage } from '../../core/Message';
import { FSParsedUrl } from '../../core/UrlParser';

/**
 * Context provided to a provider when sending a notification.
 */
export interface FSProviderContext {
  /**
   * The original raw URL string.
   */
  url: string;

  /**
   * The parsed URL components.
   */
  parsed: FSParsedUrl;

  /**
   * Tags used to filter this notification.
   */
  tags?: string[];
}

/**
 * Result of a provider send operation.
 */
export interface FSProviderResult {
  /**
   * Whether the send was successful.
   */
  success: boolean;

  /**
   * Identifier of the provider that handled the send.
   */
  providerId: string;

  /**
   * Raw response from the provider (for debugging).
   */
  raw?: unknown;

  /**
   * Error if the send failed.
   */
  error?: Error;
}

/**
 * Base interface for all notification providers.
 */
export interface FSProvider {
  /**
   * Unique identifier for this provider.
   */
  id: string;

  /**
   * URL schemas this provider handles (e.g., ['mailto'] or ['discord']).
   */
  schemas: string[];

  /**
   * Sends a notification message.
   *
   * @param message - The message to send
   * @param ctx - Context including URL and tags
   * @returns Result of the send operation
   */
  send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult>;
}

/**
 * Abstract base class for providers with common functionality.
 */
export abstract class BaseProvider implements FSProvider {
  abstract readonly id: string;
  abstract readonly schemas: string[];

  abstract send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult>;

  /**
   * Creates a successful result.
   */
  protected success(raw?: unknown): FSProviderResult {
    return {
      success: true,
      providerId: this.id,
      raw,
    };
  }

  /**
   * Creates a failed result.
   */
  protected failure(error: Error, raw?: unknown): FSProviderResult {
    return {
      success: false,
      providerId: this.id,
      error,
      raw,
    };
  }
}
