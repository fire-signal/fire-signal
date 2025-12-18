import { describe, it, expect } from 'vitest';
import {
  parseFSUrl,
  isValidFSUrl,
  FSParsedUrl,
} from '../../src/core/UrlParser';

describe('UrlParser', () => {
  describe('parseFSUrl - Basic Parsing', () => {
    it('should parse ntfy URL', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/my-topic');
      expect(parsed.schema).toBe('ntfy');
      expect(parsed.hostname).toBe('ntfy.sh');
      expect(parsed.segments).toContain('my-topic');
      expect(parsed.raw).toBe('ntfy://ntfy.sh/my-topic');
    });

    it('should parse HTTP URL with path', () => {
      const parsed = parseFSUrl('json://example.com/api/webhook');
      expect(parsed.schema).toBe('json');
      expect(parsed.hostname).toBe('example.com');
      expect(parsed.segments).toContain('api');
      expect(parsed.segments).toContain('webhook');
    });

    it('should handle URL with port', () => {
      const parsed = parseFSUrl('gotify://gotify.example.com:8080/token');
      expect(parsed.hostname).toBe('gotify.example.com');
      expect(parsed.port).toBe(8080);
    });
  });

  describe('parseFSUrl - Authentication', () => {
    it('should parse URL with username and password', () => {
      const parsed = parseFSUrl('mailto://user:pass@smtp.gmail.com:587');
      expect(parsed.username).toBe('user');
      expect(parsed.password).toBe('pass');
      expect(parsed.hostname).toBe('smtp.gmail.com');
      expect(parsed.port).toBe(587);
    });

    it('should parse URL with only username', () => {
      const parsed = parseFSUrl('ntfy://myuser@ntfy.sh/topic');
      expect(parsed.username).toBe('myuser');
      expect(parsed.password).toBeUndefined();
    });

    it('should decode URL-encoded credentials', () => {
      const parsed = parseFSUrl(
        'mailto://user%40domain:p%40ss@smtp.example.com'
      );
      expect(parsed.username).toBe('user@domain');
      expect(parsed.password).toBe('p@ss');
    });
  });

  describe('parseFSUrl - Query Parameters', () => {
    it('should parse single query param', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/topic?priority=high');
      expect(parsed.params.priority).toBe('high');
    });

    it('should parse multiple query params', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/topic?a=1&b=2&c=3');
      expect(parsed.params.a).toBe('1');
      expect(parsed.params.b).toBe('2');
      expect(parsed.params.c).toBe('3');
    });

    it('should handle URL-encoded param values', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/topic?msg=hello%20world');
      expect(parsed.params.msg).toBe('hello world');
    });

    it('should handle repeated params as array', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/topic?tag=a&tag=b');
      expect(parsed.params.tag).toEqual(['a', 'b']);
    });
  });

  describe('parseFSUrl - Provider-specific formats', () => {
    it('should parse Discord webhook URL', () => {
      const parsed = parseFSUrl('discord://webhook_id/webhook_token');
      expect(parsed.schema).toBe('discord');
      expect(parsed.hostname).toBe('webhook_id');
      expect(parsed.segments).toContain('webhook_token');
    });

    it('should parse Telegram URL', () => {
      const parsed = parseFSUrl('tgram://bot123456:ABC-DEF/987654321');
      expect(parsed.schema).toBe('tgram');
    });

    it('should parse Slack URL', () => {
      const parsed = parseFSUrl('slack://hook_id/T123/B456/C789');
      expect(parsed.schema).toBe('slack');
      expect(parsed.segments.length).toBeGreaterThanOrEqual(3);
    });

    it('should parse Pushover URL', () => {
      const parsed = parseFSUrl('pover://userkey@apitoken');
      expect(parsed.schema).toBe('pover');
    });

    it('should parse Twilio URL', () => {
      const parsed = parseFSUrl('twilio://SID:Token@+15551234567/+15559876543');
      expect(parsed.schema).toBe('twilio');
      expect(parsed.username).toBe('SID');
      expect(parsed.password).toBe('Token');
    });

    it('should parse secure schema (ntfys)', () => {
      const parsed = parseFSUrl('ntfys://ntfy.sh/topic');
      expect(parsed.schema).toBe('ntfys');
    });

    it('should parse jsons for HTTPS', () => {
      const parsed = parseFSUrl('jsons://api.example.com/webhook');
      expect(parsed.schema).toBe('jsons');
    });
  });

  describe('parseFSUrl - Edge Cases', () => {
    it('should handle alphanumeric hostname', () => {
      const parsed = parseFSUrl('discord://webhook123/abcdeftoken');
      expect(parsed.hostname).toBe('webhook123');
    });

    it('should handle special characters in path', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/my-topic_123');
      expect(parsed.segments).toContain('my-topic_123');
    });

    it('should handle empty path', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh');
      expect(parsed.segments).toEqual([]);
    });

    it('should handle trailing slash', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh/topic/');
      expect(parsed.segments).toContain('topic');
    });

    it('should trim whitespace', () => {
      const parsed = parseFSUrl('  ntfy://ntfy.sh/topic  ');
      expect(parsed.schema).toBe('ntfy');
    });
  });

  describe('parseFSUrl - Error Cases', () => {
    it('should throw on empty URL', () => {
      expect(() => parseFSUrl('')).toThrow();
    });

    it('should throw on null/undefined', () => {
      expect(() => parseFSUrl(null as any)).toThrow();
      expect(() => parseFSUrl(undefined as any)).toThrow();
    });

    it('should throw on invalid URL format', () => {
      expect(() => parseFSUrl('not-a-url')).toThrow();
      expect(() => parseFSUrl('just-text')).toThrow();
    });

    it('should throw on URL without schema', () => {
      expect(() => parseFSUrl('://ntfy.sh/topic')).toThrow();
    });
  });

  describe('isValidFSUrl', () => {
    it('should return true for valid URL', () => {
      expect(isValidFSUrl('ntfy://ntfy.sh/topic')).toBe(true);
      expect(isValidFSUrl('discord://id/token')).toBe(true);
      expect(isValidFSUrl('mailto://user:pass@smtp.gmail.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidFSUrl('invalid')).toBe(false);
      expect(isValidFSUrl('')).toBe(false);
      expect(isValidFSUrl('not-a-url')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidFSUrl(null as any)).toBe(false);
      expect(isValidFSUrl(undefined as any)).toBe(false);
    });
  });

  describe('parseFSUrl - Manual Fallback Parsing', () => {
    // These tests cover the manual parsing fallback for URLs that fail standard URL parsing

    it('should parse URL with auth and port manually', () => {
      // This format may trigger fallback parsing
      const parsed = parseFSUrl('custom://user:pass@myhost:8080/path');
      expect(parsed.username).toBe('user');
      expect(parsed.password).toBe('pass');
      expect(parsed.hostname).toBe('myhost');
      expect(parsed.port).toBe(8080);
    });

    it('should parse URL with only username (no password)', () => {
      const parsed = parseFSUrl('ntfy://myuser@ntfy.sh/topic');
      expect(parsed.username).toBe('myuser');
      expect(parsed.password).toBeUndefined();
    });

    it('should handle URL with host:port but no auth', () => {
      const parsed = parseFSUrl('gotify://gotify.local:9000/token');
      expect(parsed.hostname).toBe('gotify.local');
      expect(parsed.port).toBe(9000);
    });

    it('should handle query params in fallback parsing', () => {
      const parsed = parseFSUrl('custom://host/path?key1=value1&key2=value2');
      expect(parsed.params.key1).toBe('value1');
      expect(parsed.params.key2).toBe('value2');
    });

    it('should handle repeated query params as array', () => {
      const parsed = parseFSUrl(
        'ntfy://ntfy.sh/topic?tag=one&tag=two&tag=three'
      );
      expect(parsed.params.tag).toEqual(['one', 'two', 'three']);
    });

    it('should handle URL without path', () => {
      const parsed = parseFSUrl('ntfy://ntfy.sh');
      expect(parsed.hostname).toBe('ntfy.sh');
      expect(parsed.segments).toEqual([]);
    });

    it('should handle URL with only host (no port, no path)', () => {
      const parsed = parseFSUrl('custom://myhost');
      expect(parsed.hostname).toBe('myhost');
      expect(parsed.port).toBeUndefined();
    });

    it('should handle complex nested path', () => {
      const parsed = parseFSUrl('json://api.example.com/v1/webhooks/notify');
      expect(parsed.segments).toEqual(['v1', 'webhooks', 'notify']);
    });
  });
});
