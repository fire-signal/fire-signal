/**
 * Custom error types for fire-signal.
 */

/**
 * Base error class for all fire-signal errors.
 */
export class FSError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'FSError';
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error thrown when a provider fails to send a notification.
 */
export class FSProviderError extends FSError {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly cause?: Error
  ) {
    super(message, 'PROVIDER_ERROR');
    this.name = 'FSProviderError';
  }
}

/**
 * Error thrown when parsing a notification URL fails.
 */
export class FSParseError extends FSError {
  constructor(
    message: string,
    public readonly url: string
  ) {
    super(message, 'PARSE_ERROR');
    this.name = 'FSParseError';
  }
}

/**
 * Error thrown when loading configuration fails.
 */
export class FSConfigError extends FSError {
  constructor(
    message: string,
    public readonly path?: string
  ) {
    super(message, 'CONFIG_ERROR');
    this.name = 'FSConfigError';
  }
}

/**
 * Error thrown when a required provider is not found.
 */
export class FSProviderNotFoundError extends FSError {
  constructor(public readonly schema: string) {
    super(`No provider found for schema: ${schema}`, 'PROVIDER_NOT_FOUND');
    this.name = 'FSProviderNotFoundError';
  }
}

/**
 * Error thrown when URL validation fails with specific field errors.
 */
export class FSValidationError extends FSError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly url: string,
    public readonly suggestion?: string
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'FSValidationError';
  }
}

/**
 * Error thrown when credentials are missing or invalid.
 */
export class FSCredentialsError extends FSError {
  constructor(
    message: string,
    public readonly schema: string,
    public readonly missingFields?: string[]
  ) {
    super(message, 'CREDENTIALS_ERROR');
    this.name = 'FSCredentialsError';
  }
}

/**
 * Error thrown when a network/HTTP request fails.
 */
export class FSNetworkError extends FSError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly providerId?: string
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'FSNetworkError';
  }

  /**
   * Creates a human-readable error from HTTP status code.
   */
  static fromStatus(status: number, providerId?: string): FSNetworkError {
    const messages: Record<number, string> = {
      400: 'Bad Request - Check your message format or URL parameters',
      401: 'Unauthorized - Token expired or invalid credentials',
      403: 'Forbidden - Access denied to this resource',
      404: 'Not Found - Webhook URL is invalid or deleted',
      429: 'Rate Limited - Too many requests, try again later',
      500: 'Internal Server Error - Provider service issue',
      502: 'Bad Gateway - Provider service temporarily unavailable',
      503: 'Service Unavailable - Provider is down for maintenance',
      504: 'Gateway Timeout - Server did not respond in time',
    };
    const msg = messages[status] ?? `HTTP Error ${status}`;
    return new FSNetworkError(`[${status}] ${msg}`, status, providerId);
  }
}
