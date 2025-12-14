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
  const normalizedUrl = trimmed.replace(
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//,
    'https://'
  );

  let parsed: URL | null = null;
  let hostname: string | undefined;
  let port: number | undefined;
  let username: string | undefined;
  let password: string | undefined;
  let pathWithoutSlash: string = '';
  const params: Record<string, string | string[]> = {};

  try {
    parsed = new URL(normalizedUrl);
  } catch {
    // Fallback: manual parsing for URLs with numeric hostnames (e.g., Discord webhooks)
    // Pattern: schema://[user:pass@]host[:port][/path][?query]
    const afterSchema = trimmed.slice(schemaMatch[0].length);

    // Split by ? to get path and query
    const [pathPart, queryPart] = afterSchema.split('?');

    // Split path by /
    const pathSegments = (pathPart ?? '').split('/');

    // First segment might contain auth and host
    const firstSegment = pathSegments[0] ?? '';

    // Check for auth (user:pass@host)
    if (firstSegment.includes('@')) {
      const [authPart, hostPart] = firstSegment.split('@');
      if (authPart?.includes(':')) {
        const [user, pass] = authPart.split(':');
        username = user ? decodeURIComponent(user) : undefined;
        password = pass ? decodeURIComponent(pass) : undefined;
      } else {
        username = authPart ? decodeURIComponent(authPart) : undefined;
      }

      // Parse host:port
      if (hostPart?.includes(':')) {
        const [host, portStr] = hostPart.split(':');
        hostname = host;
        const parsedPort = parseInt(portStr ?? '', 10);
        port = isNaN(parsedPort) ? undefined : parsedPort;
      } else {
        hostname = hostPart;
      }
    } else {
      const colonIndex = firstSegment.lastIndexOf(':');
      if (colonIndex !== -1) {
        const potentialPort = firstSegment.slice(colonIndex + 1);
        const parsedPort = parseInt(potentialPort, 10);
        if (!isNaN(parsedPort) && /^\d+$/.test(potentialPort)) {
          hostname = firstSegment.slice(0, colonIndex);
          port = parsedPort;
        } else {
          hostname = firstSegment;
        }
      } else {
        hostname = firstSegment;
      }
    }

    pathWithoutSlash = pathSegments.slice(1).join('/');

    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
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
    }
  }

  if (parsed) {
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

    pathWithoutSlash = parsed.pathname.slice(1);
    hostname = parsed.hostname || undefined;
    username = parsed.username
      ? decodeURIComponent(parsed.username)
      : undefined;
    password = parsed.password
      ? decodeURIComponent(parsed.password)
      : undefined;

    if (parsed.port) {
      const parsedPort = parseInt(parsed.port, 10);
      port = isNaN(parsedPort) ? undefined : parsedPort;
    }
  }

  const segments = pathWithoutSlash.split('/').filter(Boolean);

  return {
    schema,
    hostname,
    port,
    username,
    password,
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
