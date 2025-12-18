import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmtpProvider } from '../../src/providers/email/SmtpProvider';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

describe('SmtpProvider', () => {
  let provider: SmtpProvider;

  beforeEach(() => {
    provider = new SmtpProvider();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('smtp');
    });

    it('should support mailto and mailtos schemas', () => {
      expect(provider.schemas).toContain('mailto');
      expect(provider.schemas).toContain('mailtos');
    });
  });

  describe('parseUrl', () => {
    it('should parse basic SMTP URL', () => {
      const parsed = provider.parseUrl('mailto://user:pass@smtp.gmail.com:587');
      expect(parsed.schema).toBe('mailto');
      expect(parsed.hostname).toBe('smtp.gmail.com');
      expect(parsed.port).toBe(587);
      expect(parsed.username).toBe('user');
      expect(parsed.password).toBe('pass');
    });

    it('should parse with to= query param', () => {
      const parsed = provider.parseUrl(
        'mailto://user:pass@smtp.gmail.com?to=test@example.com'
      );
      expect(parsed.params.to).toBe('test@example.com');
    });

    it('should parse with from= query param', () => {
      const parsed = provider.parseUrl(
        'mailto://user:pass@smtp.gmail.com?from=sender@example.com'
      );
      expect(parsed.params.from).toBe('sender@example.com');
    });

    it('should parse secure mailtos URL', () => {
      const parsed = provider.parseUrl(
        'mailtos://user:pass@smtp.gmail.com:465'
      );
      expect(parsed.schema).toBe('mailtos');
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const parsed = provider.parseUrl(
        'mailto://user:pass@smtp.gmail.com:587?to=test@example.com'
      );
      const result = await provider.send(
        { title: 'Test Subject', body: 'Hello Email' },
        {
          parsed,
          url: 'mailto://user:pass@smtp.gmail.com:587?to=test@example.com',
        }
      );
      expect(result).toHaveProperty('success');
    });

    it('should handle missing to address', async () => {
      const parsed = provider.parseUrl('mailto://user:pass@smtp.gmail.com:587');
      const result = await provider.send(
        { title: 'Test', body: 'Hello' },
        { parsed, url: 'mailto://user:pass@smtp.gmail.com:587' }
      );
      expect(result.success).toBe(false);
    });
  });
});
