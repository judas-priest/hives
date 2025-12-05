/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EnhancedErrorContext } from './enhancedErrorContext.js';
import { logger } from './structuredLogger.js';

/**
 * Recovery result
 */
export interface RecoveryResult<T = unknown> {
  success: boolean;
  value?: T;
  error?: Error;
  attemptsUsed: number;
  recoveryStrategy?: string;
}

/**
 * Retry options
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: Array<new (...args: unknown[]) => Error>;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  resetTimeoutMs: number;
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

/**
 * Recovery strategy interface
 */
export interface RecoveryStrategy<T = unknown> {
  name: string;
  canRecover(error: Error): boolean;
  recover(error: Error, context: EnhancedErrorContext): Promise<RecoveryResult<T>>;
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
      // Try to recover
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      await logger.info('Circuit breaker transitioning to HALF_OPEN', 'recovery');
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.options.timeoutMs)
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        void logger.info('Circuit breaker closed - normal operation resumed', 'recovery');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
      void logger.error('Circuit breaker opened - rejecting requests', undefined, 'recovery');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
  private strategies = new Map<string, RecoveryStrategy>();
  private circuitBreakers = new Map<string, CircuitBreaker<unknown>>();

  /**
   * Register a recovery strategy
   */
  registerStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.strategies.set(errorType, strategy);
    void logger.info(`Registered recovery strategy: ${strategy.name}`, 'recovery');
  }

  /**
   * Attempt to recover from an error
   */
  async recover<T>(
    error: Error,
    context: EnhancedErrorContext,
  ): Promise<RecoveryResult<T>> {
    const errorType = error.constructor.name;
    const strategy = this.strategies.get(errorType);

    if (!strategy || !strategy.canRecover(error)) {
      return {
        success: false,
        error,
        attemptsUsed: 0,
      };
    }

    try {
      await logger.info(`Attempting recovery with strategy: ${strategy.name}`, 'recovery', {
        errorType,
      });

      const result = await strategy.recover(error, context);

      if (result.success) {
        await logger.info(`Recovery successful with strategy: ${strategy.name}`, 'recovery');
      } else {
        await logger.warn(`Recovery failed with strategy: ${strategy.name}`, 'recovery');
      }

      return result;
    } catch (recoveryError) {
      await logger.error(
        'Recovery strategy threw an error',
        recoveryError as Error,
        'recovery',
      );

      return {
        success: false,
        error: recoveryError as Error,
        attemptsUsed: 0,
        recoveryStrategy: strategy.name,
      };
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
  ): Promise<RecoveryResult<T>> {
    const opts: RetryOptions = {
      maxAttempts: options.maxAttempts ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      maxDelayMs: options.maxDelayMs ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      retryableErrors: options.retryableErrors,
      onRetry: options.onRetry,
    };

    let lastError: Error | undefined;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const value = await operation();
        return {
          success: true,
          value,
          attemptsUsed: attempt,
          recoveryStrategy: 'retry-with-backoff',
        };
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (opts.retryableErrors) {
          const isRetryable = opts.retryableErrors.some(
            (ErrorClass) => error instanceof ErrorClass,
          );
          if (!isRetryable) {
            break;
          }
        }

        // Don't wait after last attempt
        if (attempt < opts.maxAttempts) {
          await logger.warn(
            `Retry attempt ${attempt}/${opts.maxAttempts} failed, waiting ${delay}ms`,
            'recovery',
          );

          opts.onRetry?.(attempt, lastError);
          await this.sleep(delay);
          delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attemptsUsed: opts.maxAttempts,
      recoveryStrategy: 'retry-with-backoff',
    };
  }

  /**
   * Try multiple operations in sequence until one succeeds
   */
  async fallbackChain<T>(operations: Array<() => Promise<T>>): Promise<RecoveryResult<T>> {
    const errors: Error[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const value = await operations[i]!();
        return {
          success: true,
          value,
          attemptsUsed: i + 1,
          recoveryStrategy: 'fallback-chain',
        };
      } catch (error) {
        errors.push(error as Error);
        await logger.warn(`Fallback attempt ${i + 1}/${operations.length} failed`, 'recovery');
      }
    }

    return {
      success: false,
      error: errors[errors.length - 1],
      attemptsUsed: operations.length,
      recoveryStrategy: 'fallback-chain',
    };
  }

  /**
   * Execute operation with circuit breaker
   */
  async withCircuitBreaker<T>(
    operationKey: string,
    operation: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(operationKey) as CircuitBreaker<T> | undefined;

    if (!breaker) {
      const opts: CircuitBreakerOptions = {
        failureThreshold: options?.failureThreshold ?? 5,
        successThreshold: options?.successThreshold ?? 2,
        timeoutMs: options?.timeoutMs ?? 30000,
        resetTimeoutMs: options?.resetTimeoutMs ?? 60000,
      };

      breaker = new CircuitBreaker<T>(opts);
      this.circuitBreakers.set(operationKey, breaker as CircuitBreaker<unknown>);
    }

    return breaker.execute(operation);
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(operationKey: string): string | undefined {
    const breaker = this.circuitBreakers.get(operationKey);
    return breaker?.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operationKey: string): void {
    const breaker = this.circuitBreakers.get(operationKey);
    breaker?.reset();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global recovery manager
 */
export const recoveryManager = new ErrorRecoveryManager();

/**
 * Common recovery strategies
 */

/**
 * Network error recovery strategy
 */
export class NetworkErrorRecoveryStrategy implements RecoveryStrategy {
  name = 'network-error-recovery';

  canRecover(error: Error): boolean {
    const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'];
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      networkErrors.some((code) => error.message.includes(code))
    );
  }

  async recover(
    error: Error,
    context: EnhancedErrorContext,
  ): Promise<RecoveryResult> {
    // This would be implemented with the actual operation to retry
    // For now, return a template result
    return {
      success: false,
      error,
      attemptsUsed: 1,
      recoveryStrategy: this.name,
    };
  }
}

/**
 * Rate limit error recovery strategy
 */
export class RateLimitRecoveryStrategy implements RecoveryStrategy {
  name = 'rate-limit-recovery';

  canRecover(error: Error): boolean {
    return (
      error.message.includes('rate limit') ||
      error.message.includes('quota exceeded') ||
      error.message.includes('429')
    );
  }

  async recover(
    error: Error,
    context: EnhancedErrorContext,
  ): Promise<RecoveryResult> {
    // Wait for rate limit reset (this would need actual reset time from error)
    const waitTime = this.extractWaitTime(error) || 60000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    return {
      success: true,
      attemptsUsed: 1,
      recoveryStrategy: this.name,
    };
  }

  private extractWaitTime(error: Error): number | null {
    // Extract wait time from error message if available
    const match = error.message.match(/retry after (\d+)/i);
    return match ? parseInt(match[1]!) * 1000 : null;
  }
}

// Register default recovery strategies
recoveryManager.registerStrategy('NetworkError', new NetworkErrorRecoveryStrategy());
recoveryManager.registerStrategy('RateLimitError', new RateLimitRecoveryStrategy());
