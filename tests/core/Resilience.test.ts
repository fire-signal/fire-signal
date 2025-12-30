import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TokenBucketLimiter,
  CircuitBreakerImpl,
  ResilienceManager,
} from '../../src/core/resilience';
import { CircuitState } from '../../src/core/errors';

describe('TokenBucketLimiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new TokenBucketLimiter(5, 1000);

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('should block requests over limit', () => {
    const limiter = new TokenBucketLimiter(2, 1000);

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const limiter = new TokenBucketLimiter(1, 100); // 1 request per 100ms

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);

    // Wait for refill
    await new Promise((r) => setTimeout(r, 120));

    expect(limiter.tryAcquire()).toBe(true);
  });

  it('should return correct wait time', () => {
    const limiter = new TokenBucketLimiter(1, 1000);

    expect(limiter.getWaitTime()).toBe(0);
    limiter.tryAcquire();
    expect(limiter.getWaitTime()).toBeGreaterThan(0);
  });
});

describe('CircuitBreakerImpl', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreakerImpl(3, 1000);
    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(cb.isAllowed()).toBe(true);
  });

  it('should open after threshold failures', () => {
    const cb = new CircuitBreakerImpl(3, 1000);

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.CLOSED);

    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.OPEN);
    expect(cb.isAllowed()).toBe(false);
  });

  it('should reset failures on success', () => {
    const cb = new CircuitBreakerImpl(3, 1000);

    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();

    // Should require 3 more failures to open
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    const cb = new CircuitBreakerImpl(1, 50);

    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    await new Promise((r) => setTimeout(r, 60));

    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    expect(cb.isAllowed()).toBe(true);
  });

  it('should close on success in HALF_OPEN state', async () => {
    const cb = new CircuitBreakerImpl(1, 50);

    cb.recordFailure();
    await new Promise((r) => setTimeout(r, 60));

    // Transition to HALF_OPEN by checking isAllowed
    expect(cb.isAllowed()).toBe(true);
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    cb.recordSuccess();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen on failure in HALF_OPEN state', async () => {
    const cb = new CircuitBreakerImpl(1, 50);

    cb.recordFailure();
    await new Promise((r) => setTimeout(r, 60));

    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('should reset circuit', () => {
    const cb = new CircuitBreakerImpl(1, 1000);

    cb.recordFailure();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });
});

describe('ResilienceManager', () => {
  it('should allow requests when no config', () => {
    const manager = new ResilienceManager({});
    expect(() => manager.checkAllowed('test')).not.toThrow();
  });

  it('should block rate limited requests', () => {
    const manager = new ResilienceManager({
      rateLimit: { requests: 1, periodMs: 1000 },
    });

    expect(() => manager.checkAllowed('test')).not.toThrow();
    expect(() => manager.checkAllowed('test')).toThrow('Rate limit exceeded');
  });

  it('should block circuit breaker open requests', () => {
    const manager = new ResilienceManager({
      circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 1000 },
    });

    manager.recordFailure('test');
    expect(() => manager.checkAllowed('test')).toThrow('Circuit breaker open');
  });

  it('should track providers independently', () => {
    const manager = new ResilienceManager({
      rateLimit: { requests: 1, periodMs: 1000 },
    });

    expect(() => manager.checkAllowed('provider1')).not.toThrow();
    expect(() => manager.checkAllowed('provider2')).not.toThrow();

    expect(() => manager.checkAllowed('provider1')).toThrow();
    expect(() => manager.checkAllowed('provider2')).toThrow();
  });

  it('should return circuit state', () => {
    const manager = new ResilienceManager({
      circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 1000 },
    });

    expect(manager.getCircuitState('test')).toBe(CircuitState.CLOSED);

    manager.recordFailure('test');
    expect(manager.getCircuitState('test')).toBe(CircuitState.OPEN);
  });
});
