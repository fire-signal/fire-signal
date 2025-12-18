import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RocketChatWebhookProvider } from '../../src/providers/rocketchat/RocketChatWebhookProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('RocketChatWebhookProvider', () => {
  let provider: RocketChatWebhookProvider;

  beforeEach(() => {
    provider = new RocketChatWebhookProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('rocketchat');
    });

    it('should support rocketchat and rocket schemas', () => {
      expect(provider.schemas).toContain('rocketchat');
      expect(provider.schemas).toContain('rocket');
    });
  });

  describe('parseUrl', () => {
    it('should parse rocketchat URL', () => {
      const parsed = provider.parseUrl(
        'rocketchat://rocket.example.com/webhook/token'
      );
      expect(parsed.schema).toBe('rocketchat');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl(
        'rocketchat://rc.example.com/hooks/abc123'
      );
      const result = await provider.send(
        { title: 'Test', body: 'Hello Rocket.Chat' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
