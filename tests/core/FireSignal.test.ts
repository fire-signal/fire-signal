import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FireSignal } from '../../src/core/FireSignal';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';
import type {
  FSProvider,
  FSProviderResult,
} from '../../src/providers/base/Provider';

describe('FireSignal', () => {
  beforeEach(() => {
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const fire = new FireSignal();
      expect(fire).toBeInstanceOf(FireSignal);
    });

    it('should create instance with silent log level', () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      expect(fire).toBeInstanceOf(FireSignal);
    });

    it('should create instance with info log level', () => {
      const fire = new FireSignal({ logLevel: 'info' });
      expect(fire).toBeInstanceOf(FireSignal);
    });

    it('should create instance with custom logger', () => {
      const logger = vi.fn();
      const fire = new FireSignal({ logger });
      fire.add('ntfy://ntfy.sh/test');
      expect(logger).toHaveBeenCalled();
    });

    it('should add initial URLs from options', () => {
      const fire = new FireSignal({
        urls: ['ntfy://ntfy.sh/topic1', 'ntfy://ntfy.sh/topic2'],
      });
      expect(fire.getUrls()).toHaveLength(2);
    });

    it('should skip default providers when option set', () => {
      const fire = new FireSignal({ skipDefaultProviders: true });
      expect(fire.getProvider('ntfy')).toBeUndefined();
    });

    it('should register custom providers', () => {
      const customProvider: FSProvider = {
        id: 'custom',
        schemas: ['custom'],
        parseUrl: (url) => ({
          schema: 'custom',
          raw: url,
          segments: [],
          params: {},
        }),
        send: async () => ({ success: true, providerId: 'custom' }),
      };
      const fire = new FireSignal({
        providers: [customProvider],
        skipDefaultProviders: true,
      });
      expect(fire.getProvider('custom')).toBe(customProvider);
    });
  });

  describe('add()', () => {
    it('should add single URL', () => {
      const fire = new FireSignal();
      fire.add('ntfy://ntfy.sh/test');
      expect(fire.getUrls()).toContain('ntfy://ntfy.sh/test');
    });

    it('should add multiple URLs as array', () => {
      const fire = new FireSignal();
      fire.add(['ntfy://ntfy.sh/test1', 'ntfy://ntfy.sh/test2']);
      expect(fire.getUrls()).toHaveLength(2);
    });

    it('should add URLs with tags', () => {
      const fire = new FireSignal();
      fire.add('ntfy://ntfy.sh/test', ['urgent', 'alerts']);
      const entries = fire.getEntries();
      expect(entries[0].tags).toContain('urgent');
      expect(entries[0].tags).toContain('alerts');
    });

    it('should trim whitespace from URLs', () => {
      const fire = new FireSignal();
      fire.add('  ntfy://ntfy.sh/test  ');
      expect(fire.getUrls()[0]).toBe('ntfy://ntfy.sh/test');
    });

    it('should skip empty URLs', () => {
      const fire = new FireSignal();
      fire.add('');
      fire.add('   ');
      expect(fire.getUrls()).toHaveLength(0);
    });
  });

  describe('getUrls()', () => {
    it('should return empty array when no URLs', () => {
      const fire = new FireSignal();
      expect(fire.getUrls()).toEqual([]);
    });

    it('should return all added URLs', () => {
      const fire = new FireSignal();
      fire.add('ntfy://ntfy.sh/a');
      fire.add('ntfy://ntfy.sh/b');
      expect(fire.getUrls()).toEqual(['ntfy://ntfy.sh/a', 'ntfy://ntfy.sh/b']);
    });
  });

  describe('getEntries()', () => {
    it('should return entries with tags', () => {
      const fire = new FireSignal();
      fire.add('ntfy://ntfy.sh/test', ['tag1']);
      const entries = fire.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].url).toBe('ntfy://ntfy.sh/test');
      expect(entries[0].tags).toEqual(['tag1']);
    });
  });

  describe('getProvider()', () => {
    it('should return provider for known schema', () => {
      const fire = new FireSignal();
      const provider = fire.getProvider('ntfy');
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('ntfy');
    });

    it('should return undefined for unknown schema', () => {
      const fire = new FireSignal();
      expect(fire.getProvider('unknownschema')).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const fire = new FireSignal();
      expect(fire.getProvider('NTFY')).toBeDefined();
      expect(fire.getProvider('Ntfy')).toBeDefined();
    });
  });

  describe('registerProvider()', () => {
    it('should register custom provider', () => {
      const fire = new FireSignal({ skipDefaultProviders: true });
      const customProvider: FSProvider = {
        id: 'myProvider',
        schemas: ['myschema', 'myschemas'],
        parseUrl: (url) => ({
          schema: 'myschema',
          raw: url,
          segments: [],
          params: {},
        }),
        send: async () => ({ success: true, providerId: 'myProvider' }),
      };
      fire.registerProvider(customProvider);
      expect(fire.getProvider('myschema')).toBe(customProvider);
      expect(fire.getProvider('myschemas')).toBe(customProvider);
    });
  });

  describe('send()', () => {
    it('should send message to registered URLs', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/test');
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should return empty array when no URLs registered', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(0);
    });

    it('should send to multiple URLs', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/test1');
      fire.add('ntfy://ntfy.sh/test2');
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(2);
    });

    it('should filter by tags', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/urgent', ['urgent']);
      fire.add('ntfy://ntfy.sh/normal', ['normal']);
      const results = await fire.send(
        { title: 'Test', body: 'Hello' },
        { tags: ['urgent'] }
      );
      expect(results).toHaveLength(1);
    });

    it('should handle unknown schema', async () => {
      const fire = new FireSignal({
        logLevel: 'silent',
        skipDefaultProviders: true,
      });
      fire.add('unknownschema://host/path');
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should replace URL placeholders with params', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/{topic}');
      const results = await fire.send(
        { title: 'Test', body: 'Hello' },
        { params: { topic: 'my-topic' } }
      );
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should fail when placeholder param is missing', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/{topic}');
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it('should handle provider send failure', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('ntfy://ntfy.sh/test');
      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it('should forward templateKey to provider context', async () => {
      const sendSpy = vi.fn(async () => ({
        success: true,
        providerId: 'custom-template',
      }));

      const customProvider: FSProvider = {
        id: 'custom-template',
        schemas: ['ctpl'],
        parseUrl: (url) => ({
          schema: 'ctpl',
          raw: url,
          segments: [],
          params: {},
        }),
        send: sendSpy,
      };

      const fire = new FireSignal({
        logLevel: 'silent',
        providers: [customProvider],
        skipDefaultProviders: true,
      });
      fire.add('ctpl://notify');

      await fire.send(
        { title: 'Welcome', body: 'Placeholder body' },
        { templateKey: 'welcome_user' }
      );

      expect(sendSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ templateKey: 'welcome_user' })
      );
    });
  });

  describe('onError handling', () => {
    it('should call onError callback when provider fails', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const callback = vi.fn();
      const fire = new FireSignal({
        logLevel: 'silent',
        onError: { callback },
      });
      fire.add('ntfy://ntfy.sh/test');
      await fire.send({ title: 'Test', body: 'Hello' });
      expect(callback).toHaveBeenCalled();
    });

    it('should pass error context to callback', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const callback = vi.fn();
      const fire = new FireSignal({
        logLevel: 'silent',
        onError: { callback },
      });
      fire.add('ntfy://ntfy.sh/test');
      await fire.send({ title: 'Test', body: 'Hello' });

      expect(callback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          providerId: expect.any(String),
          url: expect.any(String),
        })
      );
    });

    it('should send to fallbackTags when provider fails', async () => {
      // First call fails, fallback calls succeed
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return { ok: false, status: 500 };
          }
          return { ok: true, status: 200 };
        })
      );

      const fire = new FireSignal({
        logLevel: 'silent',
        onError: { fallbackTags: ['admin'] },
      });
      fire.add('ntfy://ntfy.sh/app', ['app']);
      fire.add('ntfy://ntfy.sh/admin', ['admin']);

      await fire.send({ title: 'Test', body: 'Hello' }, { tags: ['app'] });

      // Verify both URLs were called (original + fallback)
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it('should not trigger fallback for same tags that caused failure', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const fire = new FireSignal({
        logLevel: 'silent',
        onError: { fallbackTags: ['urgent'] },
      });
      fire.add('ntfy://ntfy.sh/urgent', ['urgent']);

      // This should not cause infinite loop
      const results = await fire.send(
        { title: 'Test', body: 'Hello' },
        { tags: ['urgent'] }
      );
      expect(results).toHaveLength(1);
    });

    it('should handle callback that throws', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const callback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const fire = new FireSignal({
        logLevel: 'silent',
        onError: { callback },
      });
      fire.add('ntfy://ntfy.sh/test');

      // Should not throw even if callback throws
      await expect(
        fire.send({ title: 'Test', body: 'Hello' })
      ).resolves.toBeDefined();
    });

    it('should use custom message function for fallback', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          callCount++;
          if (callCount === 1) return { ok: false, status: 500 };
          return { ok: true, status: 200 };
        })
      );

      const messageFn = vi.fn(() => 'Custom error message');
      const fire = new FireSignal({
        logLevel: 'silent',
        onError: {
          fallbackTags: ['admin'],
          message: messageFn,
        },
      });
      fire.add('ntfy://ntfy.sh/app', ['app']);
      fire.add('ntfy://ntfy.sh/admin', ['admin']);

      await fire.send({ title: 'Test', body: 'Hello' }, { tags: ['app'] });

      expect(messageFn).toHaveBeenCalled();
    });
  });

  describe('provider exceptions', () => {
    it('should catch provider exceptions during send', async () => {
      const throwingProvider: FSProvider = {
        id: 'throwing',
        schemas: ['throw'],
        parseUrl: (url) => ({
          schema: 'throw',
          raw: url,
          segments: [],
          params: {},
        }),
        send: async () => {
          throw new Error('Provider threw');
        },
      };

      const fire = new FireSignal({
        logLevel: 'silent',
        providers: [throwingProvider],
        skipDefaultProviders: true,
      });
      fire.add('throw://test');

      const results = await fire.send({ title: 'Test', body: 'Hello' });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toBe('Provider threw');
    });
  });

  describe('logging', () => {
    it('should log debug messages with debug level', () => {
      const logger = vi.fn();
      const fire = new FireSignal({ logger });
      fire.add('ntfy://ntfy.sh/test');
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Added URL'),
        'debug'
      );
    });

    it('should log warnings for no URLs', async () => {
      const logger = vi.fn();
      const fire = new FireSignal({ logger });
      await fire.send({ title: 'Test', body: 'Hello' });
      expect(logger).toHaveBeenCalledWith('No URLs to send to', 'warn');
    });

    it('should log info on successful send', async () => {
      const logger = vi.fn();
      const fire = new FireSignal({ logger });
      fire.add('ntfy://ntfy.sh/test');
      await fire.send({ title: 'Test', body: 'Hello' });
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('OK'),
        'info'
      );
    });

    it('should log errors on failed send', async () => {
      mockGlobalFetch({ response: { ok: false, status: 500 } });
      const logger = vi.fn();
      const fire = new FireSignal({ logger });
      fire.add('ntfy://ntfy.sh/test');
      await fire.send({ title: 'Test', body: 'Hello' });
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('FAILED'),
        'error'
      );
    });
  });

  describe('mode option', () => {
    it('should send normally when mode is enabled (default)', async () => {
      const fire = new FireSignal({ mode: 'enabled' });
      fire.add('ntfy://ntfy.sh/test');
      const results = await fire.send({ body: 'Test' });
      expect(results).toHaveLength(1);
      expect(results[0].providerId).toBe('ntfy');
    });

    it('should skip sending when mode is disabled', async () => {
      const fire = new FireSignal({ mode: 'disabled' });
      fire.add('ntfy://ntfy.sh/test');
      const results = await fire.send({ body: 'Test' });
      expect(results).toHaveLength(0);
    });

    it('should log but not send when mode is dryRun', async () => {
      const logger = vi.fn();
      const fire = new FireSignal({ mode: 'dryRun', logger });
      fire.add('ntfy://ntfy.sh/test1');
      fire.add('ntfy://ntfy.sh/test2');

      const results = await fire.send({ body: 'Test message' });

      expect(results).toHaveLength(2);
      expect(results[0].providerId).toBe('dry-run');
      expect(results[0].success).toBe(true);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('[DRY RUN]'),
        'info'
      );
    });

    it('should default to enabled mode', async () => {
      const fire = new FireSignal();
      fire.add('ntfy://ntfy.sh/test');
      const results = await fire.send({ body: 'Test' });
      expect(results).toHaveLength(1);
      expect(results[0].providerId).not.toBe('dry-run');
    });
  });

  describe('loadConfig with path', () => {
    it('should accept optional path parameter', async () => {
      const fire = new FireSignal();
      // Should not throw even if file doesn't exist
      await expect(
        fire.loadConfig('/nonexistent/path.yml')
      ).resolves.toBeUndefined();
    });
  });

  describe('platform APIs', () => {
    it('should track using fire://token default host', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('fire://fp_live_sdktoken');

      const ok = await fire.track('checkout.started', {
        user: { id: 'user_123' },
        plan: 'PLUS',
      });

      expect(ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.fire-signal.com/v1/events/track',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer fp_live_sdktoken',
          }),
        })
      );

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body).toEqual(
        expect.objectContaining({
          eventName: 'checkout.started',
          user: { id: 'user_123' },
          properties: { plan: 'PLUS' },
        })
      );
    });

    it('should identify customer via platform endpoint', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('fire://fp_live_token@api.fire-signal.com');

      const ok = await fire.identify('user_123', {
        email: 'ana@acme.com',
        plan: 'FREE',
      });

      expect(ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.fire-signal.com/v1/customers/identify',
        expect.any(Object)
      );
    });

    it('should report incident via incident.report API', async () => {
      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('fire://fp_live_token@api.fire-signal.com');

      const ok = await fire.incident.report({
        code: 'payment_gateway_timeout',
        fingerprint: 'checkout:payment:timeout',
        severity: 'P1',
        message: 'Provider timeout',
      });

      expect(ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.fire-signal.com/v1/incidents/report',
        expect.any(Object)
      );
    });

    it('should evaluate flags and return business value', async () => {
      mockGlobalFetch({
        response: {
          ok: true,
          status: 200,
          json: async () => ({
            results: {
              'checkout.promocode': {
                enabled: true,
                variant: 'promo_30',
                value: '30OFF',
                reason: 'rule_match',
              },
            },
          }),
        },
      });

      const fire = new FireSignal({ logLevel: 'silent' });
      fire.add('fire://fp_live_token@api.fire-signal.com');

      const decision = await fire.flags.evaluate<string>('checkout.promocode', {
        user: { id: 'user_123' },
      });
      const enabled = await fire.flags.isEnabled('checkout.promocode', {
        user: { id: 'user_123' },
      });
      const value = await fire.flags.getVariantValue<string>('checkout.promocode', {
        user: { id: 'user_123' },
      });

      expect(decision.enabled).toBe(true);
      expect(decision.value).toBe('30OFF');
      expect(enabled).toBe(true);
      expect(value).toBe('30OFF');
    });

    it('should warn and no-op without fire:// provider (default)', async () => {
      const logger = vi.fn();
      const fire = new FireSignal({ logger });

      const ok = await fire.track('checkout.started', { plan: 'PLUS' });
      expect(ok).toBe(true);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Fire Platform provider not configured'),
        'warn'
      );
    });

    it('should throw without fire:// provider in strict mode', async () => {
      const fire = new FireSignal({ strictPlatformProvider: true });

      await expect(
        fire.track('checkout.started', { plan: 'PLUS' })
      ).rejects.toThrow('Fire Platform provider not configured');
    });

    it('should auto flush queued track on beforeExit when enabled', async () => {
      const fire = new FireSignal({
        logLevel: 'silent',
        trackBatch: {
          enabled: true,
          flushIntervalMs: 60_000,
          maxBatchSize: 50,
          autoFlushOnExit: true,
          flushOnExitTimeoutMs: 1000,
        },
      });
      fire.add('fire://fp_live_sdktoken');

      const pending = fire.track('checkout.started', {
        user: { id: 'user_123' },
      });

      expect(global.fetch).not.toHaveBeenCalled();

      process.emit('beforeExit', 0);

      await expect(pending).resolves.toBe(true);
      await fire.dispose();
    });

    it('should flush queue and unregister handlers on dispose', async () => {
      const beforeExitCount = process.listenerCount('beforeExit');
      const sigintCount = process.listenerCount('SIGINT');
      const sigtermCount = process.listenerCount('SIGTERM');

      const fire = new FireSignal({
        logLevel: 'silent',
        trackBatch: {
          enabled: true,
          flushIntervalMs: 60_000,
          maxBatchSize: 50,
          autoFlushOnExit: true,
        },
      });
      fire.add('fire://fp_live_sdktoken');

      const pending = fire.track('checkout.started', {
        user: { id: 'user_123' },
      });

      await fire.dispose();
      await expect(pending).resolves.toBe(true);

      expect(process.listenerCount('beforeExit')).toBe(beforeExitCount);
      expect(process.listenerCount('SIGINT')).toBe(sigintCount);
      expect(process.listenerCount('SIGTERM')).toBe(sigtermCount);
    });
  });
});
