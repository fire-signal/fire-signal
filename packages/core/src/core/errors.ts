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
