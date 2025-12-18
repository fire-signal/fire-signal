import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GotifyProvider } from '../../src/providers/gotify/GotifyProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('GotifyProvider', () => {
  let provider: GotifyProvider;

  beforeEach(() => {
    provider = new GotifyProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('gotify');
    });

    it('should support gotify and gotifys schemas', () => {
      expect(provider.schemas).toContain('gotify');
      expect(provider.schemas).toContain('gotifys');
    });
  });

  describe('parseUrl', () => {
    it('should parse gotify URL', () => {
      const parsed = provider.parseUrl('gotify://gotify.example.com/app-token');
      expect(parsed.schema).toBe('gotify');
      expect(parsed.hostname).toBe('gotify.example.com');
    });

    it('should parse with priority', () => {
      const parsed = provider.parseUrl('gotify://host/token?priority=8');
      expect(parsed.params.priority).toBe('8');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('gotify://gotify.example.com/ABC123');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Gotify' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });
  });
});
