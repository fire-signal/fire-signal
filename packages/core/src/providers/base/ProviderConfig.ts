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
   * Delay between retries in milliseconds.
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * Default provider configuration values.
 */
export const DEFAULT_PROVIDER_CONFIG: Required<FSProviderConfig> = {
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
};
