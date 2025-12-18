import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OneSignalProvider } from '../../src/providers/onesignal/OneSignalProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('OneSignalProvider', () => {
  let provider: OneSignalProvider;

  beforeEach(() => {
    provider = new OneSignalProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('onesignal');
    });

    it('should support onesignal schema', () => {
      expect(provider.schemas).toContain('onesignal');
    });
  });

  describe('parseUrl', () => {
    it('should parse onesignal URL', () => {
      const parsed = provider.parseUrl('onesignal://app_id@api_key');
      expect(parsed.schema).toBe('onesignal');
    });

    it('should parse with segment target', () => {
      const parsed = provider.parseUrl('onesignal://app@key/#Subscribed Users');
      expect(parsed.segments.length).toBeGreaterThan(0);
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('onesignal://appid@apikey/#All');
      const result = await provider.send(
        { title: 'Test', body: 'Hello OneSignal' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
