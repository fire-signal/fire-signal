import type { FSMessage } from './Message';
import { TemplateManager } from './templates';
import { ResilienceManager, ResilienceConfig } from './resilience';
import {
  FSPlatformError,
  FSProviderNotFoundError,
  ResilienceError,
} from './errors';
import type { FSProvider, FSProviderResult } from '../providers/base/Provider';
import { createDefaultProviders } from '../providers';
import { loadFSConfig, FSConfigEntry } from '../config/ConfigLoader';
import { loadUrlsFromEnv, loadConfigPathsFromEnv } from '../config/env';
import { filterByTags, TaggedUrl } from '../config/tags';
import {
  LoggerFn,
  LogLevel,
  silentLogger,
  createConsoleLogger,
} from '../utils/logger';
import { FireProvider } from '../providers/fire/FireProvider';

/**
 * Context passed to onError handlers.
 */
export interface FSErrorContext {
  /** The provider ID that failed */
  providerId: string;
  /** The URL that was being used */
  url: string;
  /** The original message being sent */
  message: FSMessage;
  /** Tags used in this send operation */
  tags?: string[];
}

/**
 * Error handler configuration.
 */
export interface FSOnErrorConfig {
  /**
   * Tags to automatically notify when a send fails.
   * These tags will not be used if they caused the original failure (to prevent loops).
   */
  fallbackTags?: string[];
  /**
   * Custom message function for fallback notifications.
   */
  message?: (error: Error, context: FSErrorContext) => string;
  /**
   * External callback for additional error handling (e.g., send to Sentry).
   */
  callback?: (error: Error, context: FSErrorContext) => void | Promise<void>;
}

/**
 * Options for creating a FireSignal instance.
 */
export interface FireSignalOptions {
  /** Initial URLs to add. */
  urls?: string[];
  /** Custom providers to register (in addition to built-in ones). */
  providers?: FSProvider[];
  /** Logger function for debugging. */
  logger?: LoggerFn;
  /**
   * Log level. Uses console logger at this level.
   * Overridden if custom `logger` is provided.
   * @default 'silent'
   */
  logLevel?: LogLevel;
  /** Additional config file paths to load. */
  configPaths?: string[];
  /** Whether to automatically load config from default paths. @default true */
  autoLoadConfig?: boolean;
  /** Whether to skip registering built-in providers. @default false */
  skipDefaultProviders?: boolean;
  /**
   * Error handler configuration.
   * Called when a provider fails to send a notification.
   */
  onError?: FSOnErrorConfig;

  /**
   * Resilience configuration for rate limiting and circuit breaker.
   */
  resilience?: ResilienceConfig;

  /**
   * Notification mode.
   * - 'enabled': Normal operation, sends notifications (default)
   * - 'disabled': Silent, skips all sends
   * - 'dryRun': Logs but doesn't send
   * @default 'enabled'
   */
  mode?: 'enabled' | 'disabled' | 'dryRun';

  /**
   * When true, platform-only APIs throw if fire:// provider is not configured.
   * When false (default), they warn and no-op.
   */
  strictPlatformProvider?: boolean;

  /** Request timeout for platform ingestion/evaluate API calls. */
  platformTimeoutMs?: number;

  /** Max retries for transient platform request failures. */
  platformMaxRetries?: number;

  /** Track batching configuration. */
  trackBatch?: {
    enabled?: boolean;
    flushIntervalMs?: number;
    maxBatchSize?: number;
    maxQueueSize?: number;
    autoFlushOnExit?: boolean;
    flushOnExitTimeoutMs?: number;
  };
}

/**
 * Options for sending a notification.
 */
export interface SendOptions {
  /** Tags to filter URLs. Only URLs with matching tags will receive the notification. */
  tags?: string[];
  /**
   * Fire Platform audience labels (forwarded only by FireProvider).
   * This is independent from `tags`, which are used for provider routing.
   */
  audience?: string[];
  /**
   * Fire Platform segment identifier (forwarded only by FireProvider).
   * When provided, Fire Platform routes by segment.
   */
  segmentId?: string;
  /**
   * Fire Platform template key (forwarded only by FireProvider).
   * Fire Platform resolves this key to the corresponding server-side template.
   */
  templateKey?: string;
  /**
   * Parameters to replace placeholders in URLs.
   * Placeholders use {name} format and will be replaced with the corresponding value.
   * @example
   * ```typescript
   * fire.add('mailto://...?to={email}', ['user']);
   * await fire.send(msg, { params: { email: 'user@example.com' } });
   * ```
   */
  params?: Record<string, string>;
}

export interface PlatformCallOptions {
  tags?: string[];
  params?: Record<string, string>;
}

export interface TrackPayload {
  occurredAt?: string;
  user?: { id: string };
  company?: { id: string };
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IdentifyTraits {
  [key: string]: unknown;
}

export interface IncidentReportPayload {
  title?: string;
  code: string;
  fingerprint: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  message?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface FlagsContext {
  user?: { id: string };
  company?: { id: string };
  traits?: Record<string, unknown>;
}

export interface FlagDecision<T = unknown> {
  key: string;
  enabled: boolean;
  variantKey?: string;
  value?: T;
  reason?: string;
  fetchedAt: string;
}

type TrackQueueItem = {
  eventName: string;
  payload: TrackPayload;
  options: PlatformCallOptions;
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
};

/**
 * Replaces placeholders in a URL with values from params.
 * Placeholders are in {name} format.
 */
function replacePlaceholders(
  url: string,
  params: Record<string, string> = {}
): string {
  return url.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing param '${key}' for URL placeholder`);
    }
    return encodeURIComponent(value);
  });
}

/**
 * FireSignal - Unified notification sender.
 *
 * @example
 * ```typescript
 * const fs = new FireSignal({
 *   urls: ['discord://webhookId/webhookToken', 'mailto://user:pass@smtp.example.com']
 * });
 *
 * await fs.send({ title: 'Hello', body: 'World!' });
 * ```
 */
export class FireSignal {
  private entries: TaggedUrl[] = [];
  private providers: Map<string, FSProvider> = new Map();
  private logger: LoggerFn;
  private configPaths: string[];
  private configLoaded = false;
  private onErrorConfig?: FSOnErrorConfig;
  private templateManager: TemplateManager = new TemplateManager();
  private resilienceManager?: ResilienceManager;
  private mode: 'enabled' | 'disabled' | 'dryRun' = 'enabled';
  private strictPlatformProvider = false;
  private platformTimeoutMs = 5000;
  private platformMaxRetries = 2;
  private trackBatchEnabled = true;
  private trackBatchFlushIntervalMs = 1000;
  private trackBatchMaxBatchSize = 50;
  private trackBatchMaxQueueSize = 1000;
  private trackBatchAutoFlushOnExit = false;
  private trackBatchFlushOnExitTimeoutMs = 1500;
  private trackQueue: TrackQueueItem[] = [];
  private trackFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private trackExitHandlersRegistered = false;
  private trackExitInProgress = false;
  private beforeExitHandler?: () => void;
  private sigintHandler?: () => void;
  private sigtermHandler?: () => void;

  readonly incident = {
    report: async (
      payload: IncidentReportPayload,
      options: PlatformCallOptions = {}
    ): Promise<boolean> => this.reportIncident(payload, options),
  };

  readonly flags = {
    evaluate: async <T = unknown>(
      key: string,
      context: FlagsContext = {},
      options: PlatformCallOptions = {}
    ): Promise<FlagDecision<T>> => this.evaluateFlag<T>(key, context, options),
    isEnabled: async (
      key: string,
      context: FlagsContext = {},
      options: PlatformCallOptions = {}
    ): Promise<boolean> => {
      const decision = await this.evaluateFlag(key, context, options);
      return !!decision.enabled;
    },
    getVariantValue: async <T = unknown>(
      key: string,
      context: FlagsContext = {},
      options: PlatformCallOptions = {}
    ): Promise<T | undefined> => {
      const decision = await this.evaluateFlag<T>(key, context, options);
      return decision.value;
    },
  };

  constructor(options: FireSignalOptions = {}) {
    // Set up logger: custom logger takes precedence, then logLevel, then silent
    if (options.logger) {
      this.logger = options.logger;
    } else if (options.logLevel && options.logLevel !== 'silent') {
      this.logger = createConsoleLogger(options.logLevel);
    } else {
      this.logger = silentLogger;
    }

    this.configPaths = options.configPaths ?? [];
    this.onErrorConfig = options.onError;

    if (!options.skipDefaultProviders) {
      for (const provider of createDefaultProviders()) {
        this.registerProvider(provider);
      }
    }

    for (const provider of options.providers ?? []) {
      this.registerProvider(provider);
    }

    if (options.urls) {
      this.add(options.urls);
    }

    if (options.resilience) {
      this.resilienceManager = new ResilienceManager(options.resilience);
    }

    if (options.mode) {
      this.mode = options.mode;
    }

    if (typeof options.strictPlatformProvider === 'boolean') {
      this.strictPlatformProvider = options.strictPlatformProvider;
    }

    if (typeof options.platformTimeoutMs === 'number') {
      this.platformTimeoutMs = options.platformTimeoutMs;
    }

    if (typeof options.platformMaxRetries === 'number') {
      this.platformMaxRetries = Math.max(0, options.platformMaxRetries);
    }

    if (options.trackBatch) {
      if (typeof options.trackBatch.enabled === 'boolean') {
        this.trackBatchEnabled = options.trackBatch.enabled;
      }
      if (typeof options.trackBatch.flushIntervalMs === 'number') {
        this.trackBatchFlushIntervalMs = Math.max(
          100,
          options.trackBatch.flushIntervalMs
        );
      }
      if (typeof options.trackBatch.maxBatchSize === 'number') {
        this.trackBatchMaxBatchSize = Math.max(
          1,
          options.trackBatch.maxBatchSize
        );
      }
      if (typeof options.trackBatch.maxQueueSize === 'number') {
        this.trackBatchMaxQueueSize = Math.max(
          1,
          options.trackBatch.maxQueueSize
        );
      }
      if (typeof options.trackBatch.autoFlushOnExit === 'boolean') {
        this.trackBatchAutoFlushOnExit = options.trackBatch.autoFlushOnExit;
      }
      if (typeof options.trackBatch.flushOnExitTimeoutMs === 'number') {
        this.trackBatchFlushOnExitTimeoutMs = Math.max(
          100,
          options.trackBatch.flushOnExitTimeoutMs
        );
      }
    }

    if (this.trackBatchEnabled && this.trackBatchAutoFlushOnExit) {
      this.registerTrackExitHandlers();
    }
  }

  /**
   * Registers a provider for its supported schemas.
   */
  registerProvider(provider: FSProvider): void {
    for (const schema of provider.schemas) {
      this.providers.set(schema.toLowerCase(), provider);
      this.logger(
        `Registered provider '${provider.id}' for schema '${schema}'`,
        'debug'
      );
    }
  }

  /**
   * Adds one or more URLs to send notifications to.
   *
   * @param urlOrUrls - URL string or array of URLs
   * @param tags - Optional tags to associate with these URLs
   */
  add(urlOrUrls: string | string[], tags: string[] = []): void {
    const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
    for (const url of urls) {
      if (url?.trim()) {
        this.entries.push({ url: url.trim(), tags });
        this.logger(`Added URL: ${url}`, 'debug');
      }
    }
  }

  /**
   * Register a message template from a file.
   *
   * Template files support frontmatter for title:
   * ```
   * ---
   * title: Hello {{name}}!
   * ---
   * Welcome to our service, {{name}}.
   * ```
   *
   * @param name - Unique template identifier.
   * @param filePath - Path to the template file.
   */
  async registerTemplate(name: string, filePath: string): Promise<void> {
    await this.templateManager.register(name, filePath);
    this.logger(`Registered template: ${name}`, 'debug');
  }

  /**
   * Register a message template inline (no file).
   *
   * @param name - Unique template identifier.
   * @param template - Object with title (optional) and body Handlebars templates.
   */
  registerTemplateInline(
    name: string,
    template: { title?: string; body: string }
  ): void {
    this.templateManager.registerInline(name, template);
    this.logger(`Registered inline template: ${name}`, 'debug');
  }

  /**
   * Send a message using a registered template.
   *
   * @param templateName - Name of the registered template.
   * @param data - Data object for variable substitution.
   * @param options - Send options (tags, params).
   * @returns Array of results from each provider.
   *
   * @example
   * ```typescript
   * fire.registerTemplateInline('alert', {
   *   title: 'Alert: {{severity}}',
   *   body: 'Service {{service}} is {{status}}.',
   * });
   *
   * await fire.sendTemplate('alert', {
   *   severity: 'HIGH',
   *   service: 'API Gateway',
   *   status: 'DOWN',
   * }, { tags: ['ops'] });
   * ```
   */
  async sendTemplate(
    templateName: string,
    data: Record<string, unknown>,
    options: SendOptions = {}
  ): Promise<FSProviderResult[]> {
    const message = this.templateManager.render(templateName, data);
    return this.send(message, options);
  }

  private addFromConfig(entries: FSConfigEntry[]): void {
    for (const entry of entries) {
      this.entries.push({ url: entry.url, tags: entry.tags ?? [] });
    }
  }

  /**
   * Loads configuration from files and environment variables.
   *
   * @param path - Optional path to a specific config file. If provided, loads only that file.
   *               If not provided, auto-detects environment config (fire-signal.{NODE_ENV}.yml).
   */
  async loadConfig(path?: string): Promise<void> {
    if (this.configLoaded && !path) return;

    this.logger('Loading configuration...', 'debug');

    // If specific path provided, load only that file
    if (path) {
      const config = await loadFSConfig([path]);
      if (config.entries.length > 0) {
        this.logger(
          `Loaded ${config.entries.length} URLs from ${path}`,
          'debug'
        );
        this.addFromConfig(config.entries);
      }
      return;
    }

    const envUrls = loadUrlsFromEnv();
    if (envUrls.length > 0) {
      this.logger(`Found ${envUrls.length} URLs from environment`, 'debug');
      this.add(envUrls);
    }

    const envConfigPaths = loadConfigPathsFromEnv();

    // Auto-detect environment-specific config files
    const nodeEnv = process.env.NODE_ENV;
    const envSpecificPaths = nodeEnv
      ? [`fire-signal.${nodeEnv}.yml`, `fire-signal.${nodeEnv}.yaml`]
      : [];

    const allConfigPaths = [
      ...envSpecificPaths,
      ...this.configPaths,
      ...envConfigPaths,
    ];
    const config = await loadFSConfig(allConfigPaths);

    if (config.entries.length > 0) {
      this.logger(
        `Loaded ${config.entries.length} URLs from config files`,
        'debug'
      );
      this.addFromConfig(config.entries);
    }

    this.configLoaded = true;
  }

  /** Returns all registered URLs. */
  getUrls(): string[] {
    return this.entries.map((e) => e.url);
  }

  /** Returns all entries with tags. */
  getEntries(): TaggedUrl[] {
    return [...this.entries];
  }

  /** Gets a provider by schema. */
  getProvider(schema: string): FSProvider | undefined {
    return this.providers.get(schema.toLowerCase());
  }

  private extractSchema(url: string): string {
    const match = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    return match?.[1]?.toLowerCase() ?? '';
  }

  /**
   * Sends a notification to all configured URLs.
   *
   * @param message - The message to send
   * @param options - Send options (e.g., tag filtering)
   * @returns Array of results from each provider
   */
  async send(
    message: FSMessage,
    options: SendOptions = {}
  ): Promise<FSProviderResult[]> {
    const results: FSProviderResult[] = [];

    // Check mode
    if (this.mode === 'disabled') {
      return results;
    }

    const urls = filterByTags(this.entries, options.tags);

    if (urls.length === 0) {
      this.logger('No URLs to send to', 'warn');
      return results;
    }

    // DryRun mode: log but don't send
    if (this.mode === 'dryRun') {
      this.logger(
        `[DRY RUN] Would send to ${urls.length} URL(s): ${message.title || message.body.slice(0, 50)}`,
        'info'
      );
      return urls.map(() => ({ success: true, providerId: 'dry-run' }));
    }

    this.logger(`Sending to ${urls.length} URL(s)`, 'info');

    for (const rawUrl of urls) {
      // Replace placeholders in URL with params
      let processedUrl: string;
      try {
        processedUrl = replacePlaceholders(rawUrl, options.params);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ success: false, providerId: 'unknown', error: err });
        this.logger(`URL placeholder error: ${err.message}`, 'error');
        continue;
      }

      const schema = this.extractSchema(processedUrl);
      const provider = this.providers.get(schema);

      if (!provider) {
        results.push({
          success: false,
          providerId: schema || 'unknown',
          error: new FSProviderNotFoundError(schema),
        });
        this.logger(`No provider for schema: ${schema}`, 'warn');
        continue;
      }

      try {
        // Check resilience (rate limit / circuit breaker)
        if (this.resilienceManager) {
          try {
            this.resilienceManager.checkAllowed(provider.id);
          } catch (error) {
            if (error instanceof ResilienceError) {
              results.push({ success: false, providerId: provider.id, error });
              this.logger(`[${provider.id}] BLOCKED: ${error.message}`, 'warn');
              continue;
            }
            throw error;
          }
        }

        const parsed = provider.parseUrl(processedUrl);
        this.logger(`Sending via ${provider.id}...`, 'debug');

        const result = await provider.send(message, {
          url: processedUrl,
          parsed,
          tags: options.tags,
          audience: options.audience,
          segmentId: options.segmentId,
          templateKey: options.templateKey,
        });
        results.push(result);

        if (result.success) {
          this.resilienceManager?.recordSuccess(provider.id);
          this.logger(`[${provider.id}] OK`, 'info');
        } else {
          this.resilienceManager?.recordFailure(provider.id);
          this.logger(
            `[${provider.id}] FAILED: ${result.error?.message}`,
            'error'
          );
          // Call error handler
          await this.handleError(result.error ?? new Error('Unknown error'), {
            providerId: provider.id,
            url: processedUrl,
            message,
            tags: options.tags,
          });
        }
      } catch (error) {
        this.resilienceManager?.recordFailure(provider.id);
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ success: false, providerId: provider.id, error: err });
        this.logger(`[${provider.id}] ERROR: ${err.message}`, 'error');
        // Call error handler
        await this.handleError(err, {
          providerId: provider.id,
          url: processedUrl,
          message,
          tags: options.tags,
        });
      }
    }

    return results;
  }

  async track(
    eventName: string,
    payload: TrackPayload = {},
    options: PlatformCallOptions = {}
  ): Promise<boolean> {
    if (!eventName?.trim()) {
      throw new FSPlatformError(
        'eventName is required',
        'validation',
        422,
        false
      );
    }

    if (!this.trackBatchEnabled) {
      const body = this.normalizeTrackPayload(eventName.trim(), payload);
      await this.platformPost('/v1/events/track', body, options);
      return true;
    }

    return this.enqueueTrack(eventName.trim(), payload, options);
  }

  async flush(): Promise<void> {
    await this.flushTrackQueue();
  }

  async dispose(): Promise<void> {
    await this.flush();
    this.unregisterTrackExitHandlers();
  }

  private enqueueTrack(
    eventName: string,
    payload: TrackPayload,
    options: PlatformCallOptions
  ): Promise<boolean> {
    if (this.trackQueue.length >= this.trackBatchMaxQueueSize) {
      return Promise.reject(
        new FSPlatformError(
          'Track queue is full',
          'configuration',
          undefined,
          false
        )
      );
    }

    return new Promise<boolean>((resolve, reject) => {
      this.trackQueue.push({
        eventName,
        payload,
        options,
        resolve,
        reject,
      });

      if (this.trackQueue.length >= this.trackBatchMaxBatchSize) {
        void this.flushTrackQueue();
        return;
      }

      if (!this.trackFlushTimer) {
        this.trackFlushTimer = setTimeout(() => {
          this.trackFlushTimer = null;
          void this.flushTrackQueue();
        }, this.trackBatchFlushIntervalMs);
        if (typeof this.trackFlushTimer.unref === 'function') {
          this.trackFlushTimer.unref();
        }
      }
    });
  }

  private registerTrackExitHandlers(): void {
    if (this.trackExitHandlersRegistered) return;
    if (typeof process === 'undefined' || typeof process.on !== 'function')
      return;

    this.beforeExitHandler = () => {
      void this.flushTrackQueueWithTimeout(this.trackBatchFlushOnExitTimeoutMs);
    };

    this.sigintHandler = () => {
      void this.handleTrackSignalExit(130);
    };

    this.sigtermHandler = () => {
      void this.handleTrackSignalExit(143);
    };

    process.on('beforeExit', this.beforeExitHandler);
    process.on('SIGINT', this.sigintHandler);
    process.on('SIGTERM', this.sigtermHandler);
    this.trackExitHandlersRegistered = true;
  }

  private unregisterTrackExitHandlers(): void {
    if (!this.trackExitHandlersRegistered) return;
    if (typeof process === 'undefined' || typeof process.off !== 'function')
      return;

    if (this.beforeExitHandler)
      process.off('beforeExit', this.beforeExitHandler);
    if (this.sigintHandler) process.off('SIGINT', this.sigintHandler);
    if (this.sigtermHandler) process.off('SIGTERM', this.sigtermHandler);

    this.beforeExitHandler = undefined;
    this.sigintHandler = undefined;
    this.sigtermHandler = undefined;
    this.trackExitHandlersRegistered = false;
  }

  private async handleTrackSignalExit(code: number): Promise<void> {
    if (this.trackExitInProgress) return;
    this.trackExitInProgress = true;

    try {
      await this.flushTrackQueueWithTimeout(
        this.trackBatchFlushOnExitTimeoutMs
      );
    } finally {
      process.exit(code);
    }
  }

  private async flushTrackQueueWithTimeout(timeoutMs: number): Promise<void> {
    const timeout = new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    await Promise.race([this.flushTrackQueue(), timeout]);
  }

  private async flushTrackQueue(): Promise<void> {
    if (this.trackQueue.length === 0) return;

    if (this.trackFlushTimer) {
      clearTimeout(this.trackFlushTimer);
      this.trackFlushTimer = null;
    }

    const batch = this.trackQueue.splice(0, this.trackBatchMaxBatchSize);

    for (const item of batch) {
      try {
        const body = this.normalizeTrackPayload(item.eventName, item.payload);
        await this.platformPost('/v1/events/track', body, item.options);
        item.resolve(true);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.trackQueue.length > 0) {
      await this.flushTrackQueue();
    }
  }

  async identify(
    externalId: string,
    traits: IdentifyTraits = {},
    options: PlatformCallOptions = {}
  ): Promise<boolean> {
    if (!externalId?.trim()) {
      throw new FSPlatformError(
        'externalId is required',
        'validation',
        422,
        false
      );
    }

    await this.platformPost(
      '/v1/customers/identify',
      {
        externalId: externalId.trim(),
        traits,
      },
      options
    );

    return true;
  }

  private async reportIncident(
    payload: IncidentReportPayload,
    options: PlatformCallOptions = {}
  ): Promise<boolean> {
    if (!payload?.code?.trim()) {
      throw new FSPlatformError(
        'incident.code is required',
        'validation',
        422,
        false
      );
    }
    if (!payload?.fingerprint?.trim()) {
      throw new FSPlatformError(
        'incident.fingerprint is required',
        'validation',
        422,
        false
      );
    }

    await this.platformPost('/v1/incidents/report', { ...payload }, options);

    return true;
  }

  private async evaluateFlag<T = unknown>(
    key: string,
    context: FlagsContext = {},
    options: PlatformCallOptions = {}
  ): Promise<FlagDecision<T>> {
    if (!key?.trim()) {
      throw new FSPlatformError(
        'flag key is required',
        'validation',
        422,
        false
      );
    }

    const response = await this.platformPost<{ results?: Record<string, any> }>(
      '/v1/flags/evaluate',
      {
        flags: [key],
        context,
      },
      options
    );

    const result = response?.results?.[key];
    if (!result) {
      return {
        key,
        enabled: false,
        fetchedAt: new Date().toISOString(),
        reason: 'missing_result',
      };
    }

    return {
      key,
      enabled: !!result.enabled,
      variantKey: result.variant,
      value: (result.value ?? result.variant) as T | undefined,
      reason: result.reason,
      fetchedAt: new Date().toISOString(),
    };
  }

  private normalizeTrackPayload(
    eventName: string,
    payload: TrackPayload
  ): Record<string, unknown> {
    const { occurredAt, user, company, properties, ...rest } = payload;

    const hasExplicitProperties = typeof properties === 'object' && properties;
    const hasTopLevelExtra = Object.keys(rest).length > 0;

    return {
      eventName,
      ...(occurredAt ? { occurredAt } : {}),
      ...(user ? { user } : {}),
      ...(company ? { company } : {}),
      ...(hasExplicitProperties
        ? { properties }
        : hasTopLevelExtra
          ? { properties: rest }
          : {}),
    };
  }

  private resolvePlatformTarget(options: PlatformCallOptions): {
    apiKey: string;
    host: string;
    protocol: 'http' | 'https';
  } | null {
    const urls = filterByTags(this.entries, options.tags);

    for (const raw of urls) {
      const processed = replacePlaceholders(raw, options.params ?? {});
      if (!processed.toLowerCase().startsWith('fire://')) continue;

      const fireProvider = this.providers.get('fire') as
        | FireProvider
        | undefined;
      if (!fireProvider) continue;

      const parsed = fireProvider.parseUrl(processed);
      const apiKey = parsed.username;
      const hostname = parsed.hostname;
      const host = hostname
        ? parsed.port
          ? `${hostname}:${parsed.port}`
          : hostname
        : undefined;

      if (!apiKey || !host) continue;

      const isLocalHost =
        parsed.hostname?.includes('localhost') ||
        parsed.hostname === '127.0.0.1';
      return {
        apiKey,
        host,
        protocol: isLocalHost ? 'http' : 'https',
      };
    }

    return null;
  }

  private async platformPost<T = unknown>(
    endpoint: string,
    body: Record<string, unknown>,
    options: PlatformCallOptions = {}
  ): Promise<T | undefined> {
    const target = this.resolvePlatformTarget(options);

    if (!target) {
      const message =
        'Fire Platform provider not configured. Add fire://<api_key> or fire://<api_key>@<host>.';
      if (this.strictPlatformProvider) {
        throw new FSPlatformError(message, 'configuration', undefined, false);
      }
      this.logger(message, 'warn');
      return undefined;
    }

    const url = `${target.protocol}://${target.host}${endpoint}`;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.platformMaxRetries) {
      attempt += 1;
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.platformTimeoutMs
      );

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${target.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const category: FSPlatformError['category'] =
            response.status === 401 || response.status === 403
              ? 'auth'
              : response.status >= 400 && response.status < 500
                ? 'validation'
                : 'transient';
          const retryable = this.shouldRetryStatus(response.status);

          const err = new FSPlatformError(
            `Fire Platform request failed (${response.status} ${response.statusText})`,
            category,
            response.status,
            retryable,
            text
          );

          if (!retryable || attempt > this.platformMaxRetries) {
            throw err;
          }

          lastError = err;
          await this.sleepWithJitter(attempt);
          continue;
        }

        const data = (await response.json().catch(() => ({}))) as T;
        return data;
      } catch (error) {
        const rawError =
          error instanceof Error ? error : new Error(String(error));
        const abortError = rawError.name === 'AbortError';

        const err = abortError
          ? new FSPlatformError(
              'Fire Platform request timeout',
              'transient',
              408,
              true
            )
          : rawError instanceof FSPlatformError
            ? rawError
            : new FSPlatformError(
                rawError.message,
                this.isTransientError(rawError) ? 'network' : 'validation',
                undefined,
                this.isTransientError(rawError)
              );

        if (!err.retryable) {
          throw err;
        }

        if (attempt > this.platformMaxRetries) {
          throw err;
        }

        lastError = err;
        await this.sleepWithJitter(attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw (
      lastError ??
      new FSPlatformError(
        'Unknown platform request error',
        'transient',
        undefined,
        true
      )
    );
  }

  private shouldRetryStatus(status: number): boolean {
    if (status === 408 || status === 429) return true;
    if (status >= 500) return true;
    return false;
  }

  private isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch failed') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('socket') ||
      message.includes('econn')
    );
  }

  private async sleepWithJitter(attempt: number): Promise<void> {
    const base = 150;
    const backoff = base * 2 ** Math.max(0, attempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    const delay = backoff + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Handles errors by calling fallback notifications and/or external callback.
   */
  private async handleError(
    error: Error,
    context: FSErrorContext
  ): Promise<void> {
    if (!this.onErrorConfig) return;

    const { fallbackTags, message: messageFn, callback } = this.onErrorConfig;

    // Call external callback first
    if (callback) {
      try {
        await callback(error, context);
      } catch (callbackErr) {
        this.logger(
          `onError callback failed: ${callbackErr instanceof Error ? callbackErr.message : String(callbackErr)}`,
          'error'
        );
      }
    }

    // Send to fallback tags (avoiding the same tags that caused the failure)
    if (fallbackTags && fallbackTags.length > 0) {
      const safeTags = fallbackTags.filter((t) => !context.tags?.includes(t));
      this.logger(
        `onError: fallbackTags=${JSON.stringify(fallbackTags)}, safeTags=${JSON.stringify(safeTags)}`,
        'debug'
      );

      if (safeTags.length > 0) {
        // Build descriptive fallback message
        const originalTitle = context.message.title
          ? `\n📨 Original: "${context.message.title}"`
          : '';

        const fallbackMessage =
          messageFn?.(error, context) ??
          `🚨 Provider: ${context.providerId}\n❌ Error: ${error.message}${originalTitle}`;

        this.logger(
          `onError: Sending fallback to tags: ${safeTags.join(', ')}`,
          'debug'
        );

        try {
          // Use internal send without triggering another error handler
          const results = await this.sendInternal(
            { title: '⚠️ Fire-Signal Error', body: fallbackMessage },
            { tags: safeTags }
          );
          this.logger(
            `onError: Fallback results: ${results.map((r) => `${r.providerId}=${r.success}`).join(', ')}`,
            'debug'
          );
        } catch (fallbackErr) {
          this.logger(
            `Fallback notification failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
            'error'
          );
        }
      }
    }
  }

  /**
   * Internal send that doesn't trigger error handlers (to avoid infinite loops).
   */
  private async sendInternal(
    message: FSMessage,
    options: SendOptions = {}
  ): Promise<FSProviderResult[]> {
    const results: FSProviderResult[] = [];
    const urls = filterByTags(this.entries, options.tags);

    for (const rawUrl of urls) {
      let processedUrl: string;
      try {
        processedUrl = replacePlaceholders(rawUrl, options.params);
      } catch {
        continue;
      }

      const schema = this.extractSchema(processedUrl);
      const provider = this.providers.get(schema);
      if (!provider) continue;

      try {
        const parsed = provider.parseUrl(processedUrl);
        const result = await provider.send(message, {
          url: processedUrl,
          parsed,
          tags: options.tags,
          audience: options.audience,
          segmentId: options.segmentId,
          templateKey: options.templateKey,
        });
        results.push(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ success: false, providerId: provider.id, error: err });
      }
    }

    return results;
  }
}
