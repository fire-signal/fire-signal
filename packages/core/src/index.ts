/**
 * Fire-Signal: Unified notification library for Node/TypeScript.
 *
 * @example
 * ```typescript
 * import { FireSignal } from '@fire-signal/core';
 *
 * const fs = new FireSignal({
 *   urls: ['discord://webhookId/webhookToken']
 * });
 *
 * await fs.send({ title: 'Hello', body: 'World!' });
 * ```
 */

// Core - Classes and Functions
export { FireSignal } from './core/FireSignal';
export { parseFSUrl, isValidFSUrl } from './core/UrlParser';
export {
  FSError,
  FSProviderError,
  FSParseError,
  FSConfigError,
  FSProviderNotFoundError,
} from './core/errors';

// Core - Types
export type { FireSignalOptions, SendOptions } from './core/FireSignal';
export type { FSMessage, FSAttachment } from './core/Message';
export type { FSParsedUrl } from './core/UrlParser';

// Providers - Classes
export { BaseProvider } from './providers/base/Provider';
export { DEFAULT_PROVIDER_CONFIG } from './providers/base/ProviderConfig';

// Providers - Types
export type { FSProvider, FSProviderContext, FSProviderResult } from './providers/base/Provider';
export type { FSProviderConfig } from './providers/base/ProviderConfig';

// Config - Functions
export { loadFSConfig, writeFSConfig, DEFAULT_CONFIG_PATHS } from './config/ConfigLoader';
export { loadUrlsFromEnv, loadConfigPathsFromEnv, ENV_VARS } from './config/env';
export { filterByTags, parseTags } from './config/tags';

// Config - Types
export type { FSConfigEntry, FSLoadedConfig } from './config/ConfigLoader';
export type { TaggedUrl } from './config/tags';

// Utils - Functions
export { createConsoleLogger, silentLogger } from './utils/logger';
export { withRetry, sleep } from './utils/retry';
export { validateMessage, validateUrls, isNonEmptyString } from './utils/validation';

// Utils - Types
export type { LoggerFn, LogLevel } from './utils/logger';
export type { RetryOptions } from './utils/retry';
