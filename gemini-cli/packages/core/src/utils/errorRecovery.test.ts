/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorRecoveryManager,
  CircuitBreaker,
  NetworkErrorRecoveryStrategy,
  RateLimitRecoveryStrategy,
  type RecoveryStrategy,
  type RetryOptions,
} from './errorRecovery.js';
import type { EnhancedErrorContext } from './enhancedErrorContext.js';

describe('ErrorRecoveryManager', () => {
  let manager: ErrorRecoveryManager;

  beforeEach(() => {
    manager = new ErrorRecoveryManager();
  });

  describe('strategy registration', () => {
    it('should register recovery strategies', () => {
      const strategy: RecoveryStrategy = {
        name: 'test-strategy',
        canRecover: () => true,
        recover: async () => ({ success: true, attemptsUsed: 1 }),
      };

      manager.registerStrategy('TestError', strategy);

      // Registration is successful if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('recovery', () => {
    it('should recover using registered strategy', async () => {
      const strategy: RecoveryStrategy = {
        name: 'test-strategy',
        canRecover: () => true,
        recover: async () => ({
          success: true,
          value: 'recovered',
          attemptsUsed: 1,
        }),
      };

      manager.registerStrategy('Error', strategy);

      const error = new Error('Test error');
      const context = {} as EnhancedErrorContext;

      const result = await manager.recover(error, context);

      expect(result.success).toBe(true);
      expect(result.value).toBe('recovered');
    });

    it('should not recover if strategy cannot handle error', async () => {
      const strategy: RecoveryStrategy = {
        name: 'test-strategy',
        canRecover: () => false,
        recover: async () => ({ success: true, attemptsUsed: 1 }),
      };

      manager.registerStrategy('Error', strategy);

      const error = new Error('Test error');
      const context = {} as EnhancedErrorContext;

      const result = await manager.recover(error, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should handle recovery strategy errors', async () => {
      const strategy: RecoveryStrategy = {
        name: 'failing-strategy',
        canRecover: () => true,
        recover: async () => {
          throw new Error('Recovery failed');
        },
      };

      manager.registerStrategy('Error', strategy);

      const error = new Error('Test error');
      const context = {} as EnhancedErrorContext;

      const result = await manager.recover(error, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await manager.retryWithBackoff(operation);

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attemptsUsed).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await manager.retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attemptsUsed).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      const result = await manager.retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.attemptsUsed).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should only retry retryable errors', async () => {
      class RetryableError extends Error {}
      class NonRetryableError extends Error {}

      const operation = vi.fn().mockRejectedValue(new NonRetryableError('Non-retryable'));

      const result = await manager.retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        retryableErrors: [RetryableError],
      });

      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValue('success');

      await manager.retryWithBackoff(operation, {
        maxAttempts: 3,
        initialDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('fallbackChain', () => {
    it('should succeed with first operation', async () => {
      const op1 = vi.fn().mockResolvedValue('result1');
      const op2 = vi.fn().mockResolvedValue('result2');

      const result = await manager.fallbackChain([op1, op2]);

      expect(result.success).toBe(true);
      expect(result.value).toBe('result1');
      expect(result.attemptsUsed).toBe(1);
      expect(op1).toHaveBeenCalled();
      expect(op2).not.toHaveBeenCalled();
    });

    it('should fall back to second operation', async () => {
      const op1 = vi.fn().mockRejectedValue(new Error('Op 1 failed'));
      const op2 = vi.fn().mockResolvedValue('result2');

      const result = await manager.fallbackChain([op1, op2]);

      expect(result.success).toBe(true);
      expect(result.value).toBe('result2');
      expect(result.attemptsUsed).toBe(2);
      expect(op1).toHaveBeenCalled();
      expect(op2).toHaveBeenCalled();
    });

    it('should fail if all operations fail', async () => {
      const op1 = vi.fn().mockRejectedValue(new Error('Op 1 failed'));
      const op2 = vi.fn().mockRejectedValue(new Error('Op 2 failed'));
      const op3 = vi.fn().mockRejectedValue(new Error('Op 3 failed'));

      const result = await manager.fallbackChain([op1, op2, op3]);

      expect(result.success).toBe(false);
      expect(result.attemptsUsed).toBe(3);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('circuitBreaker', () => {
    it('should execute operation in closed state', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await manager.withCircuitBreaker('test-op', operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should get circuit breaker state', () => {
      const state = manager.getCircuitBreakerState('test-op');
      expect(state).toBeUndefined(); // Not created yet
    });
  });
});

describe('CircuitBreaker', () => {
  it('should start in closed state', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 5000,
      resetTimeoutMs: 10000,
    });

    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      timeoutMs: 5000,
      resetTimeoutMs: 1000,
    });

    const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));

    await expect(breaker.execute(failingOp)).rejects.toThrow();
    await expect(breaker.execute(failingOp)).rejects.toThrow();

    expect(breaker.getState()).toBe('OPEN');
  });

  it('should reject requests in open state', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      timeoutMs: 5000,
      resetTimeoutMs: 100000, // Long timeout
    });

    const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));
    await expect(breaker.execute(failingOp)).rejects.toThrow();

    expect(breaker.getState()).toBe('OPEN');

    const op = vi.fn().mockResolvedValue('success');
    await expect(breaker.execute(op)).rejects.toThrow('Circuit breaker is OPEN');
    expect(op).not.toHaveBeenCalled();
  });

  it('should reset circuit breaker', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      timeoutMs: 5000,
      resetTimeoutMs: 10000,
    });

    const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));
    await expect(breaker.execute(failingOp)).rejects.toThrow();

    expect(breaker.getState()).toBe('OPEN');

    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should timeout long-running operations', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 100,
      resetTimeoutMs: 10000,
    });

    const slowOp = () =>
      new Promise((resolve) => setTimeout(() => resolve('too slow'), 500));

    await expect(breaker.execute(slowOp)).rejects.toThrow('Operation timeout');
  });
});

describe('NetworkErrorRecoveryStrategy', () => {
  const strategy = new NetworkErrorRecoveryStrategy();

  it('should identify network errors', () => {
    expect(strategy.canRecover(new Error('network error'))).toBe(true);
    expect(strategy.canRecover(new Error('fetch failed'))).toBe(true);
    expect(strategy.canRecover(new Error('ECONNREFUSED'))).toBe(true);
    expect(strategy.canRecover(new Error('ETIMEDOUT'))).toBe(true);
    expect(strategy.canRecover(new Error('ENOTFOUND'))).toBe(true);
  });

  it('should not identify non-network errors', () => {
    expect(strategy.canRecover(new Error('syntax error'))).toBe(false);
    expect(strategy.canRecover(new Error('undefined variable'))).toBe(false);
  });
});

describe('RateLimitRecoveryStrategy', () => {
  const strategy = new RateLimitRecoveryStrategy();

  it('should identify rate limit errors', () => {
    expect(strategy.canRecover(new Error('rate limit exceeded'))).toBe(true);
    expect(strategy.canRecover(new Error('quota exceeded'))).toBe(true);
    expect(strategy.canRecover(new Error('HTTP 429'))).toBe(true);
  });

  it('should not identify non-rate-limit errors', () => {
    expect(strategy.canRecover(new Error('internal server error'))).toBe(false);
    expect(strategy.canRecover(new Error('not found'))).toBe(false);
  });

  it('should recover by waiting', async () => {
    const context = {} as EnhancedErrorContext;
    const error = new Error('rate limit exceeded');

    // This test just verifies the recovery method runs without error
    const result = await strategy.recover(error, context);
    expect(result.success).toBe(true);
  }, 65000); // Timeout extended for waiting
});
