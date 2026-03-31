import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FireProvider } from '../../src/providers/fire/FireProvider';
import { mockGlobalFetch, restoreFetch } from '../fixtures/mockFetch';

describe('FireProvider', () => {
  let provider: FireProvider;

  beforeEach(() => {
    provider = new FireProvider();
    mockGlobalFetch({
      response: {
        ok: true,
        status: 200,
        data: { id: 'msg_123', status: 'queued' },
      },
    });
  });

  afterEach(() => {
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('should have correct id and schemas', () => {
    expect(provider.id).toBe('fire');
    expect(provider.schemas).toEqual(['fire']);
  });

  it('should parse fire://token using default host', () => {
    const parsed = provider.parseUrl('fire://fp_live_onlytoken');
    expect(parsed.username).toBe('fp_live_onlytoken');
    expect(parsed.hostname).toBe('api.fire-signal.com');
  });

  it('should send to Fire Platform with HTTPS (production)', async () => {
    const message = { body: 'Test notification' };
    const context = {
      url: 'fire://fp_live_abc123@api.fire-signal.com',
      parsed: {
        schema: 'fire',
        hostname: 'api.fire-signal.com',
        username: 'fp_live_abc123',
        params: {},
        segments: [],
        raw: 'fire://fp_live_abc123@api.fire-signal.com',
      },
      tags: ['production'],
      audience: ['production'],
      segmentId: 'seg-prod',
    };

    const result = await provider.send(message, context);

    expect(result.success).toBe(true);
    expect(result.providerId).toBe('fire');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.fire-signal.com/v1/send',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer fp_live_abc123',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('should send to localhost with HTTP (development)', async () => {
    const message = { body: 'Test notification' };
    const context = {
      url: 'fire://fp_test_xyz@localhost:3001',
      parsed: {
        schema: 'fire',
        hostname: 'localhost',
        port: '3001',
        username: 'fp_test_xyz',
        params: {},
        segments: [],
        raw: 'fire://fp_test_xyz@localhost:3001',
      },
      tags: [],
      audience: [],
      segmentId: undefined,
    };

    const result = await provider.send(message, context);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/send',
      expect.any(Object)
    );
  });

  it('should forward title, body, metadata, audience, segmentId, and templateKey', async () => {
    const message = {
      title: 'Alert',
      body: 'Server down',
      metadata: { severity: 'high', email: 'ops@example.com' },
    };
    const context = {
      url: 'fire://fp_live_abc@api.fire-signal.com',
      parsed: {
        schema: 'fire',
        hostname: 'api.fire-signal.com',
        username: 'fp_live_abc',
        params: {},
        segments: [],
        raw: 'fire://fp_live_abc@api.fire-signal.com',
      },
      tags: ['critical', 'ops'],
      audience: ['critical', 'ops'],
      segmentId: 'seg-123',
      templateKey: 'welcome_user',
    };

    await provider.send(message, context);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(body).toEqual({
      title: 'Alert',
      body: 'Server down',
      data: { severity: 'high', email: 'ops@example.com' },
      audience: ['critical', 'ops'],
      segmentId: 'seg-123',
      templateKey: 'welcome_user',
    });
  });

  it('should fail if API key is missing', async () => {
    const message = { body: 'Test' };
    const context = {
      url: 'fire://api.fire-signal.com',
      parsed: {
        schema: 'fire',
        hostname: 'api.fire-signal.com',
        username: undefined, // No API key
        params: {},
        segments: [],
        raw: 'fire://api.fire-signal.com',
      },
      tags: [],
      audience: [],
      segmentId: undefined,
    };

    const result = await provider.send(message, context);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('API key is required');
  });

  it('should handle HTTP errors from Fire Platform', async () => {
    mockGlobalFetch({
      response: {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      },
    });

    const message = { body: 'Test' };
    const context = {
      url: 'fire://fp_invalid@api.fire-signal.com',
      parsed: {
        schema: 'fire',
        hostname: 'api.fire-signal.com',
        username: 'fp_invalid',
        params: {},
        segments: [],
        raw: 'fire://fp_invalid@api.fire-signal.com',
      },
      tags: [],
      audience: [],
    };

    const result = await provider.send(message, context);

    expect(result.success).toBe(false);
    expect(result.providerId).toBe('fire');
    expect(result.error?.message).toContain('Invalid API key');
  });

  it('should handle network errors', async () => {
    mockGlobalFetch({ shouldThrow: new Error('fetch failed') });

    const message = { body: 'Test' };
    const context = {
      url: 'fire://fp_live_abc@api.fire-signal.com',
      parsed: {
        schema: 'fire',
        hostname: 'api.fire-signal.com',
        username: 'fp_live_abc',
        params: {},
        segments: [],
        raw: 'fire://fp_live_abc@api.fire-signal.com',
      },
      tags: [],
      audience: [],
      segmentId: undefined,
    };

    const result = await provider.send(message, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Unable to reach');
  });
});
