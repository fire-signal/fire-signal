import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SlackWebhookProvider } from '../../src/providers/slack/SlackWebhookProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('SlackWebhookProvider', () => {
  let provider: SlackWebhookProvider;

  beforeEach(() => {
    provider = new SlackWebhookProvider();
    mockGlobalFetch({ response: { ok: true, status: 200 } });
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('slack');
    });

    it('should support slack schema', () => {
      expect(provider.schemas).toContain('slack');
    });
  });

  describe('parseUrl', () => {
    it('should parse slack webhook URL', () => {
      const parsed = provider.parseUrl(
        'slack://hook_id/token_a/token_b/token_c'
      );
      expect(parsed.schema).toBe('slack');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const parsed = provider.parseUrl('slack://hook/T123/B456/C789');
      const result = await provider.send(
        { title: 'Test', body: 'Hello Slack' },
        { parsed, url: 'slack://hook/T123/B456/C789' }
      );
      expect(result.success).toBe(true);
    });

    it('should send message with actions as blocks', async () => {
      const fetchSpy = mockGlobalFetch({ response: { ok: true, status: 200 } });
      const parsed = provider.parseUrl('slack://hook/T123/B456/C789');

      await provider.send(
        {
          body: 'Hello',
          actions: [{ label: 'Go', url: 'https://site.com', style: 'primary' }],
        },
        { parsed, url: 'slack://hook/T123/B456/C789' }
      );

      const expectedPayload = {
        text: 'Hello',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Hello',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Go',
                },
                url: 'https://site.com',
                style: 'primary',
              },
            ],
          },
        ],
      };

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('hooks.slack.com'),
        expect.objectContaining({
          body: JSON.stringify(expectedPayload),
        })
      );
    });
  });
});
