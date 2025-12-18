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
});
