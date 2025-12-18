import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TwilioProvider } from '../../src/providers/twilio/TwilioProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('TwilioProvider', () => {
  let provider: TwilioProvider;

  beforeEach(() => {
    provider = new TwilioProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('twilio');
    });

    it('should support twilio schema', () => {
      expect(provider.schemas).toContain('twilio');
    });
  });

  describe('parseUrl', () => {
    it('should parse twilio URL', () => {
      const parsed = provider.parseUrl(
        'twilio://SID:Token@+1234567890/+0987654321'
      );
      expect(parsed.schema).toBe('twilio');
      expect(parsed.username).toBe('SID');
      expect(parsed.password).toBe('Token');
    });

    it('should parse WhatsApp URL', () => {
      const parsed = provider.parseUrl(
        'twilio://SID:Token@+1234567890/w:+0987654321'
      );
      expect(parsed.segments).toContain('w:+0987654321');
    });
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      const parsed = provider.parseUrl(
        'twilio://ACtest:token@+15551234567/+15559876543'
      );
      const result = await provider.send(
        { title: 'Test', body: 'Hello Twilio' },
        { parsed }
      );
      expect(result.success).toBe(true);
    });

    it('should fail with missing credentials', async () => {
      const parsed = provider.parseUrl('twilio://invalid');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed }
      );
      expect(result.success).toBe(false);
    });
  });
});
