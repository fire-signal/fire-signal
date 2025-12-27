/**
 * Configuration options for providers.
 */
export interface FSProviderConfig {
  /**
   * Timeout in milliseconds for provider operations.
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retry attempts on failure.
   * @default 0
   */
  retries?: number;

  /**
   * Initial delay between retries in milliseconds.
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Backoff multiplier for exponential retry delay.
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Maximum delay between retries in milliseconds.
   * @default 30000
   */
  maxRetryDelay?: number;

  /**
   * HTTP status codes that should trigger a retry.
   * @default [429, 500, 502, 503, 504]
   */
  retryableStatuses?: number[];
}

/**
 * Default provider configuration values.
 */
export const DEFAULT_PROVIDER_CONFIG: Required<FSProviderConfig> = {
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxRetryDelay: 30000,
  retryableStatuses: [429, 500, 502, 503, 504],
};
