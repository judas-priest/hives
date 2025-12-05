/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BreadcrumbManager,
  createEnhancedErrorContext,
  collectEnvironmentInfo,
  collectPerformanceMetrics,
  addBreadcrumb,
  globalBreadcrumbManager,
} from './enhancedErrorContext.js';

describe('BreadcrumbManager', () => {
  let manager: BreadcrumbManager;

  beforeEach(() => {
    manager = new BreadcrumbManager(5);
  });

  it('should add breadcrumbs', () => {
    manager.addBreadcrumb('tool', 'Test message', 'info');
    const breadcrumbs = manager.getBreadcrumbs();

    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toMatchObject({
      category: 'tool',
      message: 'Test message',
      level: 'info',
    });
    expect(breadcrumbs[0]!.timestamp).toBeDefined();
  });

  it('should limit breadcrumb count', () => {
    for (let i = 0; i < 10; i++) {
      manager.addBreadcrumb('tool', `Message ${i}`, 'info');
    }

    const breadcrumbs = manager.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(5);
    expect(breadcrumbs[0]!.message).toBe('Message 5'); // First should be dropped
    expect(breadcrumbs[4]!.message).toBe('Message 9'); // Last should be kept
  });

  it('should filter breadcrumbs by level', () => {
    manager.addBreadcrumb('tool', 'Info message', 'info');
    manager.addBreadcrumb('tool', 'Error message', 'error');
    manager.addBreadcrumb('tool', 'Warning message', 'warning');

    const errors = manager.getBreadcrumbsByLevel('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('Error message');
  });

  it('should filter breadcrumbs by category', () => {
    manager.addBreadcrumb('tool', 'Tool message', 'info');
    manager.addBreadcrumb('auth', 'Auth message', 'info');
    manager.addBreadcrumb('api', 'API message', 'info');

    const toolBreadcrumbs = manager.getBreadcrumbsByCategory('tool');
    expect(toolBreadcrumbs).toHaveLength(1);
    expect(toolBreadcrumbs[0]!.message).toBe('Tool message');
  });

  it('should get recent breadcrumbs', () => {
    for (let i = 0; i < 5; i++) {
      manager.addBreadcrumb('tool', `Message ${i}`, 'info');
    }

    const recent = manager.getRecentBreadcrumbs(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]!.message).toBe('Message 3');
    expect(recent[1]!.message).toBe('Message 4');
  });

  it('should clear breadcrumbs', () => {
    manager.addBreadcrumb('tool', 'Message 1', 'info');
    manager.addBreadcrumb('tool', 'Message 2', 'info');
    expect(manager.getBreadcrumbs()).toHaveLength(2);

    manager.clear();
    expect(manager.getBreadcrumbs()).toHaveLength(0);
  });

  it('should add breadcrumb with data', () => {
    const data = { userId: '123', action: 'create' };
    manager.addBreadcrumb('tool', 'User action', 'info', data);

    const breadcrumbs = manager.getBreadcrumbs();
    expect(breadcrumbs[0]!.data).toEqual(data);
  });
});

describe('collectEnvironmentInfo', () => {
  it('should collect environment information', () => {
    const env = collectEnvironmentInfo();

    expect(env).toHaveProperty('nodeVersion');
    expect(env).toHaveProperty('platform');
    expect(env).toHaveProperty('platformVersion');
    expect(env).toHaveProperty('arch');
    expect(env).toHaveProperty('workingDirectory');
    expect(env).toHaveProperty('homeDirectory');
    expect(env).toHaveProperty('tempDirectory');
    expect(env).toHaveProperty('totalMemory');
    expect(env).toHaveProperty('cpuCount');

    expect(env.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    expect(env.totalMemory).toBeGreaterThan(0);
    expect(env.cpuCount).toBeGreaterThan(0);
  });
});

describe('collectPerformanceMetrics', () => {
  it('should collect performance metrics', () => {
    const metrics = collectPerformanceMetrics();

    expect(metrics).toHaveProperty('memoryUsage');
    expect(metrics).toHaveProperty('uptime');
    expect(metrics).toHaveProperty('cpuUsage');
    expect(metrics).toHaveProperty('loadAverage');
    expect(metrics).toHaveProperty('freeMemory');

    expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(metrics.loadAverage)).toBe(true);
    expect(metrics.freeMemory).toBeGreaterThan(0);
  });
});

describe('createEnhancedErrorContext', () => {
  it('should create enhanced error context', () => {
    const manager = new BreadcrumbManager();
    manager.addBreadcrumb('tool', 'Tool execution started', 'info');
    manager.addBreadcrumb('tool', 'Tool execution failed', 'error');

    const error = new Error('Test error');
    const sessionId = 'session-123';
    const userId = 'user-456';
    const additionalContext = { operation: 'test' };

    const context = createEnhancedErrorContext(
      error,
      manager,
      sessionId,
      userId,
      additionalContext,
    );

    expect(context.errorType).toBe('Error');
    expect(context.errorMessage).toBe('Test error');
    expect(context.sessionId).toBe(sessionId);
    expect(context.userId).toBe(userId);
    expect(context.breadcrumbs).toHaveLength(2);
    expect(context.environment).toBeDefined();
    expect(context.performanceMetrics).toBeDefined();
    expect(context.additionalContext).toEqual(additionalContext);
    expect(context.timestamp).toBeDefined();
    expect(context.stack).toBeDefined();
  });

  it('should handle custom error types', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const manager = new BreadcrumbManager();
    const error = new CustomError('Custom error message');
    const context = createEnhancedErrorContext(error, manager);

    expect(context.errorType).toBe('CustomError');
    expect(context.errorMessage).toBe('Custom error message');
  });
});

describe('globalBreadcrumbManager', () => {
  beforeEach(() => {
    globalBreadcrumbManager.clear();
  });

  it('should be a singleton', () => {
    addBreadcrumb('tool', 'Test message 1', 'info');
    addBreadcrumb('tool', 'Test message 2', 'info');

    const breadcrumbs = globalBreadcrumbManager.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(2);
  });

  it('should allow adding breadcrumbs via helper function', () => {
    addBreadcrumb('auth', 'Login attempt', 'info', { username: 'test' });

    const breadcrumbs = globalBreadcrumbManager.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toMatchObject({
      category: 'auth',
      message: 'Login attempt',
      level: 'info',
    });
    expect(breadcrumbs[0]!.data).toEqual({ username: 'test' });
  });
});
