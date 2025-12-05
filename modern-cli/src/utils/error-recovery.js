/**
 * Error Recovery Mechanisms for Modern CLI
 * Retry with backoff, fallback chains, and circuit breakers
 */

import { isRetryableError } from './errors.js';

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff(operation, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, maxAttempts, error, delay);
      }

      // Wait before retrying
      await sleep(delay);

      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Try multiple operations in sequence, return first successful
 */
export async function fallbackChain(operations) {
  let lastError;

  for (const operation of operations) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      // Continue to next operation
    }
  }

  throw lastError || new Error('All fallback operations failed');
}

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject immediately
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

/**
 * Circuit Breaker
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000;
    this.halfOpenAttempts = options.halfOpenAttempts || 1;

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
  }

  async execute(operation) {
    // If circuit is OPEN, check if we should try again
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      // Move to HALF_OPEN to test service
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();

      // Success - update state
      this.onSuccess();

      return result;
    } catch (error) {
      // Failure - update state
      this.onFailure();

      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      // If we've had enough successful attempts, close the circuit
      if (this.successCount >= this.halfOpenAttempts) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.successCount = 0;

    // If we've exceeded the failure threshold, open the circuit
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
  }
}

/**
 * Recovery Strategy Pattern
 */
export class RecoveryStrategy {
  canRecover(error) {
    return false;
  }

  async recover(operation, error, context) {
    throw new Error('RecoveryStrategy.recover() must be implemented');
  }
}

/**
 * Network Error Recovery Strategy
 */
export class NetworkErrorRecoveryStrategy extends RecoveryStrategy {
  canRecover(error) {
    return error.name === 'NetworkError' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT';
  }

  async recover(operation, error, context) {
    return await retryWithBackoff(operation, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      onRetry: (attempt, maxAttempts, err, delay) => {
        console.log(`Network error, retrying (${attempt}/${maxAttempts}) in ${delay}ms...`);
      },
    });
  }
}

/**
 * Rate Limit Recovery Strategy
 */
export class RateLimitRecoveryStrategy extends RecoveryStrategy {
  canRecover(error) {
    return error.name === 'RateLimitError' || error.statusCode === 429;
  }

  async recover(operation, error, context) {
    const retryAfter = error.retryAfter || 5000;
    console.log(`Rate limit exceeded, waiting ${retryAfter}ms before retrying...`);
    await sleep(retryAfter);
    return await operation();
  }
}

/**
 * Recovery Manager
 */
export class RecoveryManager {
  constructor() {
    this.strategies = [];
    this.circuitBreakers = new Map();

    // Register default strategies
    this.registerStrategy(new NetworkErrorRecoveryStrategy());
    this.registerStrategy(new RateLimitRecoveryStrategy());
  }

  registerStrategy(strategy) {
    this.strategies.push(strategy);
  }

  async executeWithRecovery(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      // Try to find a recovery strategy
      for (const strategy of this.strategies) {
        if (strategy.canRecover(error)) {
          try {
            return await strategy.recover(operation, error, context);
          } catch (recoveryError) {
            // Recovery failed, try next strategy
            continue;
          }
        }
      }

      // No recovery strategy worked
      throw error;
    }
  }

  async retryWithBackoff(operation, options = {}) {
    return await retryWithBackoff(operation, options);
  }

  async fallbackChain(operations) {
    return await fallbackChain(operations);
  }

  getCircuitBreaker(name, options = {}) {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(options));
    }
    return this.circuitBreakers.get(name);
  }

  async withCircuitBreaker(name, operation, options = {}) {
    const circuitBreaker = this.getCircuitBreaker(name, options);
    return await circuitBreaker.execute(operation);
  }
}

/**
 * Global recovery manager instance
 */
let globalRecoveryManager = null;

/**
 * Get global recovery manager
 */
export function getRecoveryManager() {
  if (!globalRecoveryManager) {
    globalRecoveryManager = new RecoveryManager();
  }
  return globalRecoveryManager;
}

/**
 * Utility: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
