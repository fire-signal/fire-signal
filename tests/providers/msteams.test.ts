import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MSTeamsProvider } from '../../src/providers/msteams/MSTeamsProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('MSTeamsProvider', () => {
  let provider: MSTeamsProvider;

  beforeEach(() => {
    provider = new MSTeamsProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('msteams');
    });

    it('should support msteams schema', () => {
      expect(provider.schemas).toContain('msteams');
    });
  });

  describe('parseUrl', () => {
    it('should parse msteams webhook URL', () => {
      const parsed = provider.parseUrl(
        'msteams://webhook.office.com/path/to/webhook'
      );
      expect(parsed.schema).toBe('msteams');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl(
        'msteams://teams.webhook.office.com/webhook/abc/def'
      );
      const result = await provider.send(
        { title: 'Test', body: 'Hello MS Teams' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
