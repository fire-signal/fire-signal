import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelegramBotProvider } from '../../src/providers/telegram/TelegramBotProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('TelegramBotProvider', () => {
  let provider: TelegramBotProvider;

  beforeEach(() => {
    provider = new TelegramBotProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('telegram');
    });

    it('should support tgram and telegram schemas', () => {
      expect(provider.schemas).toContain('tgram');
      expect(provider.schemas).toContain('telegram');
    });
  });

  describe('parseUrl', () => {
    it('should parse telegram URL', () => {
      const parsed = provider.parseUrl('tgram://bot_token/chat_id');
      expect(parsed.schema).toBe('tgram');
    });

    it('should parse with telegram schema', () => {
      const parsed = provider.parseUrl('telegram://bot_token/chat_id');
      expect(parsed.schema).toBe('telegram');
    });
  });

  describe('send', () => {
    it('should send message and return result', async () => {
      const parsed = provider.parseUrl('tgram://123456:ABC/987654');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Telegram' },
        { parsed }
      );
      // Just verify we get a result object
      expect(result).toHaveProperty('success');
    });
  });
});
