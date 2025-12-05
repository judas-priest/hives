/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'node:os';
import process from 'node:process';

/**
 * Error breadcrumb for tracking error context trail
 */
export interface ErrorBreadcrumb {
  timestamp: string;
  category: 'tool' | 'command' | 'auth' | 'api' | 'filesystem' | 'network' | 'user';
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

/**
 * Environment information for error context
 */
export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  platformVersion: string;
  arch: string;
  cliVersion?: string;
  workingDirectory: string;
  homeDirectory: string;
  tempDirectory: string;
  totalMemory: number;
  cpuCount: number;
}

/**
 * Performance metrics at time of error
 */
export interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  loadAverage: number[];
  freeMemory: number;
}

/**
 * Enhanced error context with comprehensive debugging information
 */
export interface EnhancedErrorContext {
  // Basic error information
  timestamp: string;
  errorType: string;
  errorMessage: string;
  stack?: string;

  // Session information
  sessionId?: string;
  userId?: string;

  // Environment information
  environment: EnvironmentInfo;

  // Performance metrics
  performanceMetrics?: PerformanceMetrics;

  // Breadcrumb trail
  breadcrumbs: ErrorBreadcrumb[];

  // Additional context
  additionalContext?: Record<string, unknown>;
}

/**
 * Breadcrumb manager for tracking error context
 */
export class BreadcrumbManager {
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs = 50) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  /**
   * Add a breadcrumb to the trail
   */
  addBreadcrumb(
    category: ErrorBreadcrumb['category'],
    message: string,
    level: ErrorBreadcrumb['level'] = 'info',
    data?: Record<string, unknown>,
  ): void {
    const breadcrumb: ErrorBreadcrumb = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get all breadcrumbs
   */
  getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Get breadcrumbs filtered by level
   */
  getBreadcrumbsByLevel(level: ErrorBreadcrumb['level']): ErrorBreadcrumb[] {
    return this.breadcrumbs.filter((b) => b.level === level);
  }

  /**
   * Get breadcrumbs filtered by category
   */
  getBreadcrumbsByCategory(
    category: ErrorBreadcrumb['category'],
  ): ErrorBreadcrumb[] {
    return this.breadcrumbs.filter((b) => b.category === category);
  }

  /**
   * Clear all breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get recent breadcrumbs (last N)
   */
  getRecentBreadcrumbs(count: number): ErrorBreadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }
}

/**
 * Collect environment information
 */
export function collectEnvironmentInfo(): EnvironmentInfo {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    platformVersion: os.release(),
    arch: process.arch,
    cliVersion: process.env.CLI_VERSION,
    workingDirectory: process.cwd(),
    homeDirectory: os.homedir(),
    tempDirectory: os.tmpdir(),
    totalMemory: os.totalmem(),
    cpuCount: os.cpus().length,
  };
}

/**
 * Collect performance metrics
 */
export function collectPerformanceMetrics(): PerformanceMetrics {
  return {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    cpuUsage: process.cpuUsage(),
    loadAverage: os.loadavg(),
    freeMemory: os.freemem(),
  };
}

/**
 * Create enhanced error context
 */
export function createEnhancedErrorContext(
  error: Error,
  breadcrumbManager: BreadcrumbManager,
  sessionId?: string,
  userId?: string,
  additionalContext?: Record<string, unknown>,
): EnhancedErrorContext {
  return {
    timestamp: new Date().toISOString(),
    errorType: error.constructor.name,
    errorMessage: error.message,
    stack: error.stack,
    sessionId,
    userId,
    environment: collectEnvironmentInfo(),
    performanceMetrics: collectPerformanceMetrics(),
    breadcrumbs: breadcrumbManager.getBreadcrumbs(),
    additionalContext,
  };
}

/**
 * Singleton breadcrumb manager
 */
export const globalBreadcrumbManager = new BreadcrumbManager();

/**
 * Helper function to add a breadcrumb to the global manager
 */
export function addBreadcrumb(
  category: ErrorBreadcrumb['category'],
  message: string,
  level: ErrorBreadcrumb['level'] = 'info',
  data?: Record<string, unknown>,
): void {
  globalBreadcrumbManager.addBreadcrumb(category, message, level, data);
}
