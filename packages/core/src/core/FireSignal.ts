/**
 * FireSignal - Main notification class.
 */

import { FSMessage } from './Message';
import { FSParsedUrl, parseFSUrl } from './UrlParser';
import { FSProviderNotFoundError } from './errors';
import { FSProvider, FSProviderResult } from '../providers/base/Provider';
import { createDefaultProviders } from '../providers';
import { loadFSConfig, FSConfigEntry } from '../config/ConfigLoader';
import { loadUrlsFromEnv, loadConfigPathsFromEnv } from '../config/env';
import { filterByTags, TaggedUrl } from '../config/tags';
import { LoggerFn, silentLogger } from '../utils/logger';

/**
 * Options for creating a FireSignal instance.
 */
export interface FireSignalOptions {
  /**
   * Initial URLs to add.
   */
  urls?: string[];

  /**
   * Custom providers to register (in addition to built-in ones).
   */
  providers?: FSProvider[];

  /**
   * Logger function for debugging.
   */
  logger?: LoggerFn;

  /**
   * Additional config file paths to load.
   */
  configPaths?: string[];

  /**
   * Whether to automatically load config from default paths.
   * @default true
   */
  autoLoadConfig?: boolean;

  /**
   * Whether to skip registering built-in providers.
   * @default false
   */
  skipDefaultProviders?: boolean;
}

/**
 * Options for sending a notification.
 */
export interface SendOptions {
  /**
   * Tags to filter URLs. Only URLs with matching tags will receive the notification.
   * If empty or not provided, all URLs will receive the notification.
   */
  tags?: string[];
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

  constructor(options: FireSignalOptions = {}) {
    this.logger = options.logger ?? silentLogger;
    this.configPaths = options.configPaths ?? [];

    // Register built-in providers by default
    if (!options.skipDefaultProviders) {
      for (const provider of createDefaultProviders()) {
        this.registerProvider(provider);
      }
    }

    // Register custom providers
    for (const provider of options.providers ?? []) {
      this.registerProvider(provider);
    }

    // Add initial URLs
    if (options.urls) {
      this.add(options.urls);
    }
  }

  /**
   * Registers a provider.
   */
  registerProvider(provider: FSProvider): void {
    for (const schema of provider.schemas) {
      this.providers.set(schema.toLowerCase(), provider);
      this.logger(`Registered provider '${provider.id}' for schema '${schema}'`, 'debug');
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
      if (url && url.trim()) {
        this.entries.push({ url: url.trim(), tags });
        this.logger(`Added URL: ${url}`, 'debug');
      }
    }
  }

  /**
   * Adds URLs from configuration entries.
   */
  private addFromConfig(entries: FSConfigEntry[]): void {
    for (const entry of entries) {
      this.entries.push({ url: entry.url, tags: entry.tags ?? [] });
    }
  }

  /**
   * Loads configuration from files and environment variables.
   */
  async loadConfig(): Promise<void> {
    if (this.configLoaded) {
      return;
    }

    this.logger('Loading configuration...', 'debug');

    // Load from environment variables
    const envUrls = loadUrlsFromEnv();
    if (envUrls.length > 0) {
      this.logger(`Found ${envUrls.length} URLs from environment`, 'debug');
      this.add(envUrls);
    }

    // Load from config files
    const envConfigPaths = loadConfigPathsFromEnv();
    const allConfigPaths = [...this.configPaths, ...envConfigPaths];
    const config = await loadFSConfig(allConfigPaths);

    if (config.entries.length > 0) {
      this.logger(`Loaded ${config.entries.length} URLs from config files`, 'debug');
      this.addFromConfig(config.entries);
    }

    this.configLoaded = true;
  }

  /**
   * Returns all registered URLs.
   */
  getUrls(): string[] {
    return this.entries.map((e) => e.url);
  }

  /**
   * Returns all entries with tags.
   */
  getEntries(): TaggedUrl[] {
    return [...this.entries];
  }

  /**
   * Gets a provider by schema.
   */
  getProvider(schema: string): FSProvider | undefined {
    return this.providers.get(schema.toLowerCase());
  }

  /**
   * Sends a notification to all configured URLs.
   *
   * @param message - The message to send
   * @param options - Send options (e.g., tag filtering)
   * @returns Array of results from each provider
   */
  async send(message: FSMessage, options: SendOptions = {}): Promise<FSProviderResult[]> {
    const results: FSProviderResult[] = [];

    // Filter URLs by tags
    const urls = filterByTags(this.entries, options.tags);

    if (urls.length === 0) {
      this.logger('No URLs to send to', 'warn');
      return results;
    }

    this.logger(`Sending to ${urls.length} URL(s)`, 'info');

    // Send to each URL
    for (const rawUrl of urls) {
      let parsed: FSParsedUrl;

      try {
        parsed = parseFSUrl(rawUrl);
      } catch (error) {
        results.push({
          success: false,
          providerId: 'unknown',
          error: error instanceof Error ? error : new Error(String(error)),
        });
        continue;
      }

      const provider = this.providers.get(parsed.schema);

      if (!provider) {
        results.push({
          success: false,
          providerId: parsed.schema,
          error: new FSProviderNotFoundError(parsed.schema),
        });
        this.logger(`No provider for schema: ${parsed.schema}`, 'warn');
        continue;
      }

      try {
        this.logger(`Sending via ${provider.id}...`, 'debug');
        const result = await provider.send(message, {
          url: rawUrl,
          parsed,
          tags: options.tags,
        });
        results.push(result);

        if (result.success) {
          this.logger(`[${provider.id}] OK`, 'info');
        } else {
          this.logger(`[${provider.id}] FAILED: ${result.error?.message}`, 'error');
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({
          success: false,
          providerId: provider.id,
          error: err,
        });
        this.logger(`[${provider.id}] ERROR: ${err.message}`, 'error');
      }
    }

    return results;
  }
}
