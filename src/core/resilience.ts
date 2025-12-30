import { CircuitState, ResilienceError } from './errors';

/**
 * Resilience configuration options.
 */
export interface ResilienceConfig {
  /**
   * Rate limiting configuration.
   */
  rateLimit?: {
    /** Maximum number of requests allowed. */
    requests: number;
    /** Time period in milliseconds. */
    periodMs: number;
  };

  /**
   * Circuit breaker configuration.
   */
  circuitBreaker?: {
    /** Number of consecutive failures before opening the circuit. */
    failureThreshold: number;
    /** Time in milliseconds before attempting to close the circuit. */
    resetTimeoutMs: number;
  };
}

/**
 * Token Bucket Rate Limiter.
 *
 * Controls the rate of requests using a token bucket algorithm.
 * Tokens are replenished over time up to a maximum capacity.
 */
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per ms

  /**
   * @param requests - Maximum number of requests (bucket capacity).
   * @param periodMs - Time period for refill in milliseconds.
   */
  constructor(requests: number, periodMs: number) {
    this.capacity = requests;
    this.tokens = requests;
    this.refillRate = requests / periodMs;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token for a request.
   *
   * @returns true if token acquired, false if rate limited.
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get time in ms until next token is available.
   */
  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Circuit Breaker pattern implementation.
 *
 * Prevents cascading failures by temporarily stopping requests
 * to a failing service.
 *
 * States:
 * - CLOSED: Normal operation, requests allowed.
 * - OPEN: Failing, requests blocked.
 * - HALF_OPEN: Testing if service recovered.
 */
export class CircuitBreakerImpl {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold: number, resetTimeoutMs: number) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  /**
   * Check if request is allowed through the circuit.
   */
  isAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow one request to test
    return true;
  }

  /**
   * Record a successful request.
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // Service recovered, close the circuit
      this.state = CircuitState.CLOSED;
    }
    this.failures = 0;
  }

  /**
   * Record a failed request.
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Still failing, reopen
      this.state = CircuitState.OPEN;
      return;
    }

    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Get current circuit state.
   */
  getState(): CircuitState {
    // Update state based on timeout
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastFailureTime >= this.resetTimeoutMs
    ) {
      this.state = CircuitState.HALF_OPEN;
    }
    return this.state;
  }

  /**
   * Reset the circuit to closed state.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Manages resilience features (rate limiting + circuit breaker) per provider.
 */
export class ResilienceManager {
  private rateLimiters: Map<string, TokenBucketLimiter> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerImpl> = new Map();
  private config: ResilienceConfig;

  constructor(config: ResilienceConfig = {}) {
    this.config = config;
  }

  /**
   * Check if a request to a provider is allowed.
   *
   * @param providerId - Provider identifier.
   * @returns true if allowed, throws ResilienceError if blocked.
   */
  checkAllowed(providerId: string): void {
    // Check circuit breaker first
    if (this.config.circuitBreaker) {
      const cb = this.getCircuitBreaker(providerId);
      if (!cb.isAllowed()) {
        throw new ResilienceError(
          `Circuit breaker open for provider '${providerId}'`,
          'circuit_breaker',
          providerId
        );
      }
    }

    // Check rate limiter
    if (this.config.rateLimit) {
      const limiter = this.getRateLimiter(providerId);
      if (!limiter.tryAcquire()) {
        throw new ResilienceError(
          `Rate limit exceeded for provider '${providerId}'`,
          'rate_limit',
          providerId,
          limiter.getWaitTime()
        );
      }
    }
  }

  /**
   * Record a successful request.
   */
  recordSuccess(providerId: string): void {
    if (this.config.circuitBreaker) {
      const cb = this.getCircuitBreaker(providerId);
      cb.recordSuccess();
    }
  }

  /**
   * Record a failed request.
   */
  recordFailure(providerId: string): void {
    if (this.config.circuitBreaker) {
      const cb = this.getCircuitBreaker(providerId);
      cb.recordFailure();
    }
  }

  /**
   * Get circuit state for a provider.
   */
  getCircuitState(providerId: string): CircuitState | undefined {
    if (!this.config.circuitBreaker) return undefined;
    return this.getCircuitBreaker(providerId).getState();
  }

  private getRateLimiter(providerId: string): TokenBucketLimiter {
    if (!this.rateLimiters.has(providerId)) {
      const { requests, periodMs } = this.config.rateLimit!;
      this.rateLimiters.set(
        providerId,
        new TokenBucketLimiter(requests, periodMs)
      );
    }
    return this.rateLimiters.get(providerId)!;
  }

  private getCircuitBreaker(providerId: string): CircuitBreakerImpl {
    if (!this.circuitBreakers.has(providerId)) {
      const { failureThreshold, resetTimeoutMs } = this.config.circuitBreaker!;
      this.circuitBreakers.set(
        providerId,
        new CircuitBreakerImpl(failureThreshold, resetTimeoutMs)
      );
    }
    return this.circuitBreakers.get(providerId)!;
  }
}

export { CircuitState };
