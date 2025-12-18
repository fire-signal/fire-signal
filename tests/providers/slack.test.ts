import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SlackWebhookProvider } from '../../src/providers/slack/SlackWebhookProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('SlackWebhookProvider', () => {
  let provider: SlackWebhookProvider;

  beforeEach(() => {
    provider = new SlackWebhookProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('slack');
    });

    it('should support slack schema', () => {
      expect(provider.schemas).toContain('slack');
    });
  });

  describe('parseUrl', () => {
    it('should parse slack webhook URL', () => {
      const parsed = provider.parseUrl(
        'slack://hook_id/token_a/token_b/token_c'
      );
      expect(parsed.schema).toBe('slack');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('slack://hook/T123/B456/C789');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Slack' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
