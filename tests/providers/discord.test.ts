import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DiscordWebhookProvider } from '../../src/providers/discord/DiscordWebhookProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('DiscordWebhookProvider', () => {
  let provider: DiscordWebhookProvider;

  beforeEach(() => {
    provider = new DiscordWebhookProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('discord');
    });

    it('should support discord schema', () => {
      expect(provider.schemas).toContain('discord');
    });
  });

  describe('parseUrl', () => {
    it('should parse discord webhook URL', () => {
      const parsed = provider.parseUrl('discord://webhook_id/webhook_token');
      expect(parsed.schema).toBe('discord');
      expect(parsed.hostname).toBe('webhook_id');
      expect(parsed.segments).toContain('webhook_token');
    });

    it('should parse with query params', () => {
      const parsed = provider.parseUrl('discord://id/token?username=MyBot');
      expect(parsed.params.username).toBe('MyBot');
    });

    it('should parse with avatar override', () => {
      const parsed = provider.parseUrl(
        'discord://id/token?avatar_url=https://example.com/img.png'
      );
      expect(parsed.params.avatar_url).toBe('https://example.com/img.png');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('discord://123456/abcdef');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Discord' },
        { parsed, url: 'discord://123456/abcdef' }
      );
      expect(result.success).toBe(true);
    });

    it('should handle failed request', async () => {
      mockGlobalFetch({ response: { ok: false, status: 400 } });
      const parsed = provider.parseUrl('discord://123456/abcdef');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed, url: 'discord://123456/abcdef' }
      );
      expect(result.success).toBe(false);
    });

    it('should handle network error', async () => {
      mockGlobalFetch({ shouldThrow: new Error('Network error') });
      const parsed = provider.parseUrl('discord://123456/abcdef');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed, url: 'discord://123456/abcdef' }
      );
      expect(result.success).toBe(false);
    });

    it('should send without title', async () => {
      const parsed = provider.parseUrl('discord://123456/abcdef');
      const result = await provider.send(
        { body: 'Hello Discord' },
        { parsed, url: 'discord://123456/abcdef' }
      );
      expect(result.success).toBe(true);
    });
  });
});
