/**
 * Mock fetch for provider tests
 */
import { vi } from 'vitest';

export interface MockResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

export interface MockFetchOptions {
  response?: MockResponse;
  shouldThrow?: Error;
}

const defaultResponse: MockResponse = {
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
};

/**
 * Creates a mock fetch function for testing
 */
export function createMockFetch(options: MockFetchOptions = {}) {
  const { response = defaultResponse, shouldThrow } = options;

  return vi.fn(async (_url: string, _init?: RequestInit) => {
    if (shouldThrow) {
      throw shouldThrow;
    }
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText ?? 'OK',
      json: response.json ?? (async () => ({})),
      text: response.text ?? (async () => ''),
    };
  });
}

/**
 * Mocks global fetch with given options
 */
export function mockGlobalFetch(options: MockFetchOptions = {}) {
  const mockFetch = createMockFetch(options);
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

/**
 * Restores original fetch
 */
export function restoreFetch() {
  vi.unstubAllGlobals();
}
