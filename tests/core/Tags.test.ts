import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FireSignal } from '../../src/core/FireSignal';
import type { FSProvider } from '../../src/providers/base/Provider';

describe('Tag Filtering & Routing', () => {
  let fire: FireSignal;
  let mockProvider: FSProvider;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendSpy = vi.fn().mockResolvedValue({ success: true, providerId: 'mock' });

    mockProvider = {
      id: 'mock',
      schemas: ['mock'],
      parseUrl: (url) => ({
        schema: 'mock',
        raw: url,
        segments: [],
        params: {},
        hostname: 'mock',
        path: '',
      }),
      send: sendSpy,
    };

    fire = new FireSignal({
      logLevel: 'silent',
      skipDefaultProviders: true,
      providers: [mockProvider],
    });
  });

  it('should send to all URLs when no tags specified (broadcast)', async () => {
    fire.add('mock://a', ['tag1']);
    fire.add('mock://b', ['tag2']);
    fire.add('mock://c'); // no tags

    await fire.send({ body: 'test' });

    expect(sendSpy).toHaveBeenCalledTimes(3);
  });

  it('should only send to URLs matching the specfied tag', async () => {
    fire.add('mock://dev', ['dev']);
    fire.add('mock://prod', ['prod']);

    await fire.send({ body: 'test' }, { tags: ['dev'] });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ url: 'mock://dev' })
    );
  });

  it('should match any tag from the list (OR logic)', async () => {
    fire.add('mock://backend', ['backend']);
    fire.add('mock://frontend', ['frontend']);
    fire.add('mock://ops', ['ops']);

    // Send to backend OR ops
    await fire.send({ body: 'test' }, { tags: ['backend', 'ops'] });

    expect(sendSpy).toHaveBeenCalledTimes(2);
    // Should NOT have called frontend
    const calls = sendSpy.mock.calls.map((c) => c[1].url);
    expect(calls).toContain('mock://backend');
    expect(calls).toContain('mock://ops');
    expect(calls).not.toContain('mock://frontend');
  });

  it('should match case-insensitive tags', async () => {
    fire.add('mock://lower', ['dev']);
    fire.add('mock://upper', ['DEV']);

    await fire.send({ body: 'test' }, { tags: ['DeV'] });

    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('should propagate tags to provider context', async () => {
    fire.add('mock://test', ['my-tag']);

    await fire.send({ body: 'test' }, { tags: ['my-tag'] });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: ['my-tag'],
      })
    );
  });
});
