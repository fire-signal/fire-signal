import type { FSMessage } from '../../core/Message';

/**
 * Represents a parsed notification URL.
 */
export interface FSParsedUrl {
  /** The URL schema/protocol (e.g., 'mailto', 'discord', 'slack'). */
  schema: string;
  /** Hostname portion of the URL. */
  hostname?: string;
  /** Port number if specified. */
  port?: number;
  /** Username for authentication. */
  username?: string;
  /** Password for authentication. */
  password?: string;
  /** Path portion of the URL (without leading slash). */
  path?: string;
  /** Path split into segments. */
  segments: string[];
  /** Query parameters parsed from the URL. */
  params: Record<string, string | string[]>;
  /** The original raw URL string. */
  raw: string;
}

/**
 * Context provided to a provider when sending a notification.
 */
export interface FSProviderContext {
  url: string;
  parsed: FSParsedUrl;
  tags?: string[];
}

/**
 * Result of a provider send operation.
 */
export interface FSProviderResult {
  success: boolean;
  providerId: string;
  raw?: unknown;
  error?: Error;
}

/**
 * Interface for notification providers.
 */
export interface FSProvider {
  /** Unique identifier for this provider. */
  id: string;
  /** URL schemas this provider handles (e.g., ['discord']). */
  schemas: string[];
  /** Parses a URL into components specific to this provider. */
  parseUrl(raw: string): FSParsedUrl;
  /** Sends a notification message. */
  send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult>;
}

/**
 * Base class for notification providers with common helper methods.
 */
export abstract class BaseProvider implements FSProvider {
  abstract readonly id: string;
  abstract readonly schemas: string[];

  abstract parseUrl(raw: string): FSParsedUrl;
  abstract send(message: FSMessage, ctx: FSProviderContext): Promise<FSProviderResult>;

  /** Creates a success result. */
  protected success(raw?: unknown): FSProviderResult {
    return { success: true, providerId: this.id, raw };
  }

  /** Creates a failure result. */
  protected failure(error: Error, raw?: unknown): FSProviderResult {
    return { success: false, providerId: this.id, error, raw };
  }

  /** Gets the first value from a param that may be an array. */
  protected getParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /** Extracts the schema from a URL string. */
  protected extractSchema(url: string): string {
    const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    return match?.[1]?.toLowerCase() ?? '';
  }

  /** Parses a query string into a params object. */
  protected parseQueryParams(queryString: string): Record<string, string | string[]> {
    const params: Record<string, string | string[]> = {};
    if (!queryString) return params;

    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      const existing = params[key];
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          params[key] = [existing, value];
        }
      } else {
        params[key] = value;
      }
    });
    return params;
  }
}
