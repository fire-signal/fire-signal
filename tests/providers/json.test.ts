import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonWebhookProvider } from '../../src/providers/http/JsonWebhookProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('JsonWebhookProvider', () => {
  let provider: JsonWebhookProvider;

  beforeEach(() => {
    provider = new JsonWebhookProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('json');
    });

    it('should support json and jsons schemas', () => {
      expect(provider.schemas).toContain('json');
      expect(provider.schemas).toContain('jsons');
    });
  });

  describe('parseUrl', () => {
    it('should parse json webhook URL', () => {
      const parsed = provider.parseUrl('json://example.com/api/webhook');
      expect(parsed.schema).toBe('json');
      expect(parsed.hostname).toBe('example.com');
    });

    it('should parse jsons for HTTPS', () => {
      const parsed = provider.parseUrl('jsons://secure.example.com/webhook');
      expect(parsed.schema).toBe('jsons');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('json://example.com/webhook');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Webhook' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });

    it('should handle network error', async () => {
      mockGlobalFetch({ shouldThrow: new Error('Network error') });
      const parsed = provider.parseUrl('json://example.com/webhook');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed }
      );
      expect(result.success).toBe(false);
    });
  });
});
