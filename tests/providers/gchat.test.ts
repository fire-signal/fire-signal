import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GoogleChatProvider } from '../../src/providers/gchat/GoogleChatProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('GoogleChatProvider', () => {
  let provider: GoogleChatProvider;

  beforeEach(() => {
    provider = new GoogleChatProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('gchat');
    });

    it('should support gchat and googlechat schemas', () => {
      expect(provider.schemas).toContain('gchat');
      expect(provider.schemas).toContain('googlechat');
    });
  });

  describe('parseUrl', () => {
    it('should parse gchat URL', () => {
      const parsed = provider.parseUrl(
        'gchat://chat.googleapis.com/v1/spaces/SPACE/messages'
      );
      expect(parsed.schema).toBe('gchat');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl(
        'gchat://chat.googleapis.com/v1/spaces/ABC/messages?key=KEY&token=TOKEN'
      );
      const result = await provider.send(
        { title: 'Test', body: 'Hello Google Chat' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
