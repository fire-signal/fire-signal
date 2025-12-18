import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MattermostProvider } from '../../src/providers/mattermost/MattermostProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('MattermostProvider', () => {
  let provider: MattermostProvider;

  beforeEach(() => {
    provider = new MattermostProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('mattermost');
    });

    it('should support mmost and mmosts schemas', () => {
      expect(provider.schemas).toContain('mmost');
      expect(provider.schemas).toContain('mmosts');
    });
  });

  describe('parseUrl', () => {
    it('should parse mattermost URL', () => {
      const parsed = provider.parseUrl(
        'mmost://mattermost.example.com/webhook_id'
      );
      expect(parsed.schema).toBe('mmost');
    });

    it('should parse with channel override', () => {
      const parsed = provider.parseUrl('mmost://host/hook?channel=general');
      expect(parsed.params.channel).toBe('general');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('mmost://mm.example.com/webhook123');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Mattermost' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
