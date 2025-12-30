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
        { parsed, url: 'msteams://teams.webhook.office.com/webhook/abc/def' }
      );
      expect(result.success).toBe(true);
    });

    it('should send message with potentialAction for actions', async () => {
      const fetchSpy = mockGlobalFetch({ response: { ok: true, status: 200 } });
      const parsed = provider.parseUrl(
        'msteams://teams.webhook.office.com/webhook/abc/def'
      );

      await provider.send(
        {
          body: 'Hello',
          actions: [{ label: 'View', url: 'https://ms.com', style: 'primary' }],
        },
        { parsed, url: 'msteams://teams.webhook.office.com/webhook/abc/def' }
      );

      const expectedPayload = {
        options: {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'fire-signal/0.1.0',
          },
          method: 'POST',
          body: expect.stringMatching(/"@type":"OpenUri"/),
        },
      };

      // We inspect the body string more closely to ensure structure
      const call = fetchSpy.mock.calls[0];
      const body = JSON.parse(call[1]?.body as string);

      expect(body.potentialAction).toHaveLength(1);
      expect(body.potentialAction[0]).toEqual({
        '@type': 'OpenUri',
        name: 'View',
        targets: [{ os: 'default', uri: 'https://ms.com' }],
      });
    });
  });
});
