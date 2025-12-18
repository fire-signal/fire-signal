import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PushoverProvider } from '../../src/providers/pushover/PushoverProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('PushoverProvider', () => {
  let provider: PushoverProvider;

  beforeEach(() => {
    provider = new PushoverProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('pushover');
    });

    it('should support pover and pushover schemas', () => {
      expect(provider.schemas).toContain('pover');
      expect(provider.schemas).toContain('pushover');
    });
  });

  describe('parseUrl', () => {
    it('should parse pushover URL', () => {
      const parsed = provider.parseUrl('pover://user_key@api_token');
      expect(parsed.schema).toBe('pover');
    });

    it('should parse with device', () => {
      const parsed = provider.parseUrl('pover://user@token/myphone');
      expect(parsed.segments).toContain('myphone');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('pover://userkey@apitoken');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Pushover' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
