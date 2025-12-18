import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NtfyProvider } from '../../src/providers/ntfy/NtfyProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('NtfyProvider', () => {
  let provider: NtfyProvider;

  beforeEach(() => {
    provider = new NtfyProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('ntfy');
    });

    it('should support ntfy and ntfys schemas', () => {
      expect(provider.schemas).toContain('ntfy');
      expect(provider.schemas).toContain('ntfys');
    });
  });

  describe('parseUrl', () => {
    it('should parse ntfy URL', () => {
      const parsed = provider.parseUrl('ntfy://ntfy.sh/my-topic');
      expect(parsed.schema).toBe('ntfy');
      expect(parsed.hostname).toBe('ntfy.sh');
    });

    it('should parse query params', () => {
      const parsed = provider.parseUrl(
        'ntfy://ntfy.sh/topic?priority=high&tags=alert'
      );
      expect(parsed.params.priority).toBe('high');
      expect(parsed.params.tags).toBe('alert');
    });

    it('should parse ntfys for HTTPS', () => {
      const parsed = provider.parseUrl('ntfys://ntfy.sh/topic');
      expect(parsed.schema).toBe('ntfys');
    });

    it('should parse with authentication', () => {
      const parsed = provider.parseUrl('ntfy://user:pass@ntfy.sh/topic');
      expect(parsed.username).toBe('user');
      expect(parsed.password).toBe('pass');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('ntfy://ntfy.sh/test-topic');
      const result = await provider.send(
        { title: 'Test', body: 'Hello ntfy' },
        { parsed, url: 'ntfy://ntfy.sh/test-topic' }
      );
      expect(result.success).toBe(true);
    });

    it('should handle failed request', async () => {
      mockGlobalFetch({ response: { ok: false, status: 403 } });
      const parsed = provider.parseUrl('ntfy://ntfy.sh/topic');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed, url: 'ntfy://ntfy.sh/topic' }
      );
      expect(result.success).toBe(false);
    });

    it('should handle network error', async () => {
      mockGlobalFetch({ shouldThrow: new Error('Network error') });
      const parsed = provider.parseUrl('ntfy://ntfy.sh/topic');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed, url: 'ntfy://ntfy.sh/topic' }
      );
      expect(result.success).toBe(false);
    });

    it('should send without title', async () => {
      const parsed = provider.parseUrl('ntfy://ntfy.sh/topic');
      const result = await provider.send(
        { body: 'Just body' },
        { parsed, url: 'ntfy://ntfy.sh/topic' }
      );
      expect(result.success).toBe(true);
    });

    it('should work with priority param', async () => {
      const parsed = provider.parseUrl('ntfy://ntfy.sh/topic?priority=5');
      const result = await provider.send(
        { title: 'Urgent', body: 'High priority' },
        { parsed, url: 'ntfy://ntfy.sh/topic?priority=5' }
      );
      expect(result.success).toBe(true);
    });
  });
});
