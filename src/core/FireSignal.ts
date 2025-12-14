import type { FSMessage } from './Message';
import { FSProviderNotFoundError } from './errors';
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
}

/**
 * Options for sending a notification.
 */
export interface SendOptions {
  /** Tags to filter URLs. Only URLs with matching tags will receive the notification. */
  tags?: string[];
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

  private addFromConfig(entries: FSConfigEntry[]): void {
    for (const entry of entries) {
      this.entries.push({ url: entry.url, tags: entry.tags ?? [] });
    }
  }

  /**
   * Loads configuration from files and environment variables.
   */
  async loadConfig(): Promise<void> {
    if (this.configLoaded) return;

    this.logger('Loading configuration...', 'debug');

    const envUrls = loadUrlsFromEnv();
    if (envUrls.length > 0) {
      this.logger(`Found ${envUrls.length} URLs from environment`, 'debug');
      this.add(envUrls);
    }

    const envConfigPaths = loadConfigPathsFromEnv();
    const allConfigPaths = [...this.configPaths, ...envConfigPaths];
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
    const urls = filterByTags(this.entries, options.tags);

    if (urls.length === 0) {
      this.logger('No URLs to send to', 'warn');
      return results;
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
        const parsed = provider.parseUrl(processedUrl);
        this.logger(`Sending via ${provider.id}...`, 'debug');

        const result = await provider.send(message, {
          url: processedUrl,
          parsed,
          tags: options.tags,
        });
        results.push(result);

        if (result.success) {
          this.logger(`[${provider.id}] OK`, 'info');
        } else {
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
        const fallbackMessage =
          messageFn?.(error, context) ??
          `🚨 Notification failed: [${context.providerId}] ${error.message}`;

        this.logger(
          `onError: Sending fallback to tags: ${safeTags.join(', ')}`,
          'debug'
        );

        try {
          // Use internal send without triggering another error handler
          const results = await this.sendInternal(
            { title: 'Fire-Signal Error', body: fallbackMessage },
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
