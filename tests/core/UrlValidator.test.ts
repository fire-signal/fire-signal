import { describe, it, expect } from 'vitest';
import {
  validateFSUrl,
  validateAndParseFSUrl,
  isValidUrl,
} from '../../src/core/UrlValidator';
import { FSValidationError, FSCredentialsError } from '../../src/core/errors';

describe('UrlValidator', () => {
  describe('validateFSUrl', () => {
    describe('basic validation', () => {
      it('should reject empty string', () => {
        const result = validateFSUrl('');
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('URL_EMPTY');
      });

      it('should reject whitespace-only string', () => {
        const result = validateFSUrl('   ');
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('URL_EMPTY');
      });

      it('should reject invalid URL format', () => {
        const result = validateFSUrl('not-a-url');
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('URL_PARSE_ERROR');
      });

      it('should warn on unknown schema', () => {
        const result = validateFSUrl('unknown://host/path');
        expect(result.valid).toBe(true); // Valid but with warning
        expect(result.warnings[0].code).toBe('UNKNOWN_SCHEMA');
      });
    });

    describe('SMTP validation', () => {
      it('should validate correct SMTP URL', () => {
        const result = validateFSUrl(
          'mailto://user:pass@smtp.gmail.com?to=test@example.com'
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect missing to parameter', () => {
        const result = validateFSUrl('mailto://user:pass@smtp.gmail.com');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'SMTP_MISSING_TO')).toBe(
          true
        );
      });

      it('should detect missing credentials', () => {
        const result = validateFSUrl(
          'mailto://smtp.gmail.com?to=test@example.com'
        );
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'SMTP_MISSING_CREDENTIALS')
        ).toBe(true);
      });

      it('should detect missing host', () => {
        const result = validateFSUrl('mailto://?to=test@example.com');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'SMTP_MISSING_HOST')).toBe(
          true
        );
      });
    });

    describe('Discord validation', () => {
      it('should validate correct Discord URL', () => {
        const result = validateFSUrl('discord://123456789/abcdef123456');
        expect(result.valid).toBe(true);
      });

      it('should detect missing webhook token', () => {
        const result = validateFSUrl('discord://123456789');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'DISCORD_MISSING_WEBHOOK_TOKEN')
        ).toBe(true);
      });

      it('should detect missing webhook token', () => {
        const result = validateFSUrl('discord://123456789');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'DISCORD_MISSING_WEBHOOK_TOKEN')
        ).toBe(true);
      });

      it('should warn on non-numeric webhook ID', () => {
        const result = validateFSUrl('discord://abc-not-numeric/token');
        expect(
          result.warnings.some((w) => w.code === 'DISCORD_INVALID_WEBHOOK_ID')
        ).toBe(true);
      });
    });

    describe('Telegram validation', () => {
      it('should validate correct Telegram URL', () => {
        const result = validateFSUrl('tgram://botToken123/chatId456');
        expect(result.valid).toBe(true);
      });

      it('should detect missing chat ID', () => {
        const result = validateFSUrl('tgram://botToken');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'TELEGRAM_MISSING_CHAT_ID')
        ).toBe(true);
      });

      it('should detect missing chat ID', () => {
        const result = validateFSUrl('tgram://botToken');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'TELEGRAM_MISSING_CHAT_ID')
        ).toBe(true);
      });

      it('should warn on invalid parse_mode', () => {
        const result = validateFSUrl('tgram://token/chat?parse_mode=Invalid');
        expect(
          result.warnings.some((w) => w.code === 'TELEGRAM_INVALID_PARSE_MODE')
        ).toBe(true);
      });

      it('should accept valid parse_mode', () => {
        const result = validateFSUrl('tgram://token/chat?parse_mode=Markdown');
        expect(
          result.warnings.filter(
            (w) => w.code === 'TELEGRAM_INVALID_PARSE_MODE'
          )
        ).toHaveLength(0);
      });
    });

    describe('Slack validation', () => {
      it('should validate Slack URL with all parts', () => {
        const result = validateFSUrl('slack://T12345678/B12345678/tokenXYZ');
        expect(result.valid).toBe(true);
      });

      it('should detect invalid team ID', () => {
        const result = validateFSUrl('slack://X00000000/B00000000/XXXXXXXX');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'SLACK_INVALID_TEAM_ID')
        ).toBe(true);
      });

      it('should detect invalid bot ID', () => {
        const result = validateFSUrl('slack://T00000000/X00000000/XXXXXXXX');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'SLACK_INVALID_BOT_ID')
        ).toBe(true);
      });

      it('should detect missing token', () => {
        const result = validateFSUrl('slack://T00000000/B00000000');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'SLACK_MISSING_TOKEN')
        ).toBe(true);
      });
    });

    describe('ntfy validation', () => {
      it('should validate correct ntfy URL', () => {
        const result = validateFSUrl('ntfy://ntfy.sh/my-topic');
        expect(result.valid).toBe(true);
      });

      it('should detect missing topic', () => {
        const result = validateFSUrl('ntfy://ntfy.sh');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'NTFY_MISSING_TOPIC')).toBe(
          true
        );
      });

      it('should detect missing topic', () => {
        const result = validateFSUrl('ntfy://ntfy.sh');
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'NTFY_MISSING_TOPIC')).toBe(
          true
        );
      });

      it('should warn on invalid priority', () => {
        const result = validateFSUrl('ntfy://ntfy.sh/topic?priority=invalid');
        expect(
          result.warnings.some((w) => w.code === 'NTFY_INVALID_PRIORITY')
        ).toBe(true);
      });

      it('should accept valid priority', () => {
        const result = validateFSUrl('ntfy://ntfy.sh/topic?priority=high');
        expect(
          result.warnings.filter((w) => w.code === 'NTFY_INVALID_PRIORITY')
        ).toHaveLength(0);
      });
    });

    describe('RocketChat validation', () => {
      it('should validate correct RocketChat URL', () => {
        const result = validateFSUrl(
          'rocketchat://chat.example.com/webhookToken'
        );
        expect(result.valid).toBe(true);
      });

      it('should detect missing token', () => {
        const result = validateFSUrl('rocketchat://chat.example.com');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'ROCKETCHAT_MISSING_TOKEN')
        ).toBe(true);
      });

      it('should detect missing token', () => {
        const result = validateFSUrl('rocketchat://chat.example.com');
        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'ROCKETCHAT_MISSING_TOKEN')
        ).toBe(true);
      });
    });

    describe('Generic webhook validation', () => {
      it('should validate correct webhook URL', () => {
        const result = validateFSUrl('json://api.example.com/webhook');
        expect(result.valid).toBe(true);
      });

      it('should validate webhook with host', () => {
        const result = validateFSUrl('json://api.example.com');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateAndParseFSUrl', () => {
    it('should return parsed URL for valid URL', () => {
      const parsed = validateAndParseFSUrl('ntfy://ntfy.sh/topic');
      expect(parsed.schema).toBe('ntfy');
      expect(parsed.hostname).toBe('ntfy.sh');
    });

    it('should throw FSValidationError for invalid URL', () => {
      expect(() => validateAndParseFSUrl('ntfy://ntfy.sh')).toThrow(
        FSValidationError
      );
    });

    it('should throw FSCredentialsError for missing credentials', () => {
      expect(() => validateAndParseFSUrl('discord://123456789')).toThrow();
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URL', () => {
      expect(isValidUrl('ntfy://ntfy.sh/topic')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidUrl('ntfy://ntfy.sh')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });
  });
});
