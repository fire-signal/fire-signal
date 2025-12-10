import { FSParseError } from './errors';

/**
 * Represents a parsed notification URL.
 */
export interface FSParsedUrl {
  /**
   * The URL schema/protocol (e.g., 'mailto', 'discord', 'slack').
   */
  schema: string;

  /**
   * Hostname portion of the URL.
   */
  hostname?: string;

  /**
   * Port number if specified.
   */
  port?: number;

  /**
   * Username for authentication.
   */
  username?: string;

  /**
   * Password for authentication.
   */
  password?: string;

  /**
   * Path portion of the URL (without leading slash).
   */
  path?: string;

  /**
   * Path split into segments.
   */
  segments: string[];

  /**
   * Query parameters parsed from the URL.
   * Values can be strings or arrays for repeated params.
   */
  params: Record<string, string | string[]>;

  /**
   * The original raw URL string.
   */
  raw: string;
}

/**
 * Parses a fire-signal notification URL into its components.
 *
 * Supports various URL formats like:
 * - mailto://user:pass@smtp.example.com?to=email@example.com
 * - discord://webhookId/webhookToken
 * - slack://hook/token
 * - tgram://botToken/chatId
 * - json://hostname/path
 * - rocketchat://hostname/webhookToken?channel=#general
 *
 * @param raw - The raw URL string to parse
 * @returns Parsed URL components
 * @throws FSParseError if the URL is invalid
 */
export function parseFSUrl(raw: string): FSParsedUrl {
  if (!raw || typeof raw !== 'string') {
    throw new FSParseError('URL must be a non-empty string', raw);
  }

  const trimmed = raw.trim();

  // Extract schema before trying to parse as URL
  const schemaMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (!schemaMatch) {
    throw new FSParseError('Invalid URL format: missing schema', raw);
  }

  const schema = schemaMatch[1]!.toLowerCase();

  // For custom schemas, convert to a parseable format
  // Replace custom schema with https for URL parsing
  const normalizedUrl = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, 'https://');

  let parsed: URL;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new FSParseError(`Failed to parse URL: ${raw}`, raw);
  }

  // Parse query parameters
  const params: Record<string, string | string[]> = {};
  parsed.searchParams.forEach((value, key) => {
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

  // Parse path segments (remove leading slash and filter empty)
  const pathWithoutSlash = parsed.pathname.slice(1);
  const segments = pathWithoutSlash.split('/').filter(Boolean);

  // Parse port
  let port: number | undefined;
  if (parsed.port) {
    port = parseInt(parsed.port, 10);
    if (isNaN(port)) {
      port = undefined;
    }
  }

  return {
    schema,
    hostname: parsed.hostname || undefined,
    port,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    path: pathWithoutSlash || undefined,
    segments,
    params,
    raw: trimmed,
  };
}

/**
 * Checks if a URL string looks like a valid fire-signal URL.
 *
 * @param url - URL string to check
 * @returns true if the URL appears valid
 */
export function isValidFSUrl(url: string): boolean {
  try {
    parseFSUrl(url);
    return true;
  } catch {
    return false;
  }
}
