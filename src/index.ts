export { FireSignal } from './core/FireSignal';
export {
  FSError,
  FSProviderError,
  FSParseError,
  FSConfigError,
  FSProviderNotFoundError,
  FSValidationError,
  FSCredentialsError,
  FSNetworkError,
  FSPlatformError,
} from './core/errors';
export {
  validateFSUrl,
  validateAndParseFSUrl,
  isValidUrl,
} from './core/UrlValidator';
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './core/UrlValidator';

export type {
  FireSignalOptions,
  SendOptions,
  PlatformCallOptions,
  TrackPayload,
  IdentifyTraits,
  IncidentReportPayload,
  FlagsContext,
  FlagDecision,
} from './core/FireSignal';
export type { FSMessage, FSAttachment, FSAction } from './core/Message';
export { TemplateManager } from './core/templates';
export type { FSTemplate } from './core/templates';
export type { ResilienceConfig } from './core/resilience';
export { CircuitState, ResilienceError } from './core/errors';

export { BaseProvider } from './providers/base/Provider';
export { DEFAULT_PROVIDER_CONFIG } from './providers/base/ProviderConfig';

export {
  SmtpProvider,
  DiscordWebhookProvider,
  RocketChatWebhookProvider,
  SlackWebhookProvider,
  TelegramBotProvider,
  JsonWebhookProvider,
  createDefaultProviders,
  PROVIDER_SCHEMAS,
} from './providers';

export type {
  FSProvider,
  FSProviderContext,
  FSProviderResult,
  FSParsedUrl,
} from './providers/base/Provider';
export type { FSProviderConfig } from './providers/base/ProviderConfig';

export {
  loadFSConfig,
  writeFSConfig,
  DEFAULT_CONFIG_PATHS,
} from './config/ConfigLoader';
export {
  loadUrlsFromEnv,
  loadConfigPathsFromEnv,
  ENV_VARS,
} from './config/env';
export { filterByTags, parseTags } from './config/tags';

export type { FSConfigEntry, FSLoadedConfig } from './config/ConfigLoader';
export type { TaggedUrl } from './config/tags';

export { createConsoleLogger, silentLogger } from './utils/logger';
export { withRetry, sleep } from './utils/retry';
export {
  validateMessage,
  validateUrls,
  isNonEmptyString,
} from './utils/validation';

export type { LoggerFn, LogLevel } from './utils/logger';
export type { RetryOptions } from './utils/retry';
