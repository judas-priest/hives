/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StructuredLogger,
  LogLevel,
  ConsoleTransport,
  type LogEntry,
  type LogTransport,
} from './structuredLogger.js';

class MockTransport implements LogTransport {
  public logs: LogEntry[] = [];

  async log(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
  }

  async flush(): Promise<void> {
    // Mock flush
  }

  clear(): void {
    this.logs = [];
  }
}

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let mockTransport: MockTransport;

  beforeEach(() => {
    logger = new StructuredLogger();
    logger.clearTransports();
    mockTransport = new MockTransport();
    logger.addTransport(mockTransport);
  });

  it('should log debug messages', async () => {
    await logger.debug('Debug message', 'test', { detail: 'value' });

    expect(mockTransport.logs).toHaveLength(0); // Default min level is INFO
  });

  it('should log info messages', async () => {
    await logger.info('Info message', 'test', { detail: 'value' });

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]).toMatchObject({
      level: 'INFO',
      message: 'Info message',
      category: 'test',
      context: { detail: 'value' },
    });
  });

  it('should log warning messages', async () => {
    await logger.warn('Warning message', 'test');

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('WARN');
    expect(mockTransport.logs[0]!.message).toBe('Warning message');
  });

  it('should log error messages with error object', async () => {
    const error = new Error('Test error');
    await logger.error('Error occurred', error, 'test');

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('ERROR');
    expect(mockTransport.logs[0]!.error).toMatchObject({
      name: 'Error',
      message: 'Test error',
    });
    expect(mockTransport.logs[0]!.error!.stack).toBeDefined();
  });

  it('should log fatal messages', async () => {
    const error = new Error('Fatal error');
    await logger.fatal('Fatal error occurred', error, 'test');

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('FATAL');
  });

  it('should respect minimum log level', async () => {
    logger.setMinLevel('ERROR');

    await logger.debug('Debug message');
    await logger.info('Info message');
    await logger.warn('Warning message');
    await logger.error('Error message');

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('ERROR');
  });

  it('should set session ID', async () => {
    logger.setSessionId('session-123');
    await logger.info('Test message');

    expect(mockTransport.logs[0]!.sessionId).toBe('session-123');
  });

  it('should set user ID', async () => {
    logger.setUserId('user-456');
    await logger.info('Test message');

    expect(mockTransport.logs[0]!.userId).toBe('user-456');
  });

  it('should log tool execution', async () => {
    await logger.tool('read-file', 'started', { file: 'test.ts' });

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.message).toContain('Tool read-file');
    expect(mockTransport.logs[0]!.category).toBe('tool');
  });

  it('should log authentication events', async () => {
    await logger.auth('login', true, { method: 'oauth' });

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('INFO');
    expect(mockTransport.logs[0]!.message).toContain('Auth login');
    expect(mockTransport.logs[0]!.message).toContain('success');
  });

  it('should log failed authentication as warning', async () => {
    await logger.auth('login', false);

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.level).toBe('WARN');
    expect(mockTransport.logs[0]!.message).toContain('failed');
  });

  it('should log API calls', async () => {
    await logger.api('/gemini/v1/chat', 1250, 200);

    expect(mockTransport.logs).toHaveLength(1);
    expect(mockTransport.logs[0]!.message).toContain('API call');
    expect(mockTransport.logs[0]!.context).toMatchObject({
      duration: 1250,
      statusCode: 200,
    });
  });

  it('should handle multiple transports', async () => {
    const transport2 = new MockTransport();
    logger.addTransport(transport2);

    await logger.info('Test message');

    expect(mockTransport.logs).toHaveLength(1);
    expect(transport2.logs).toHaveLength(1);
  });

  it('should include timestamp in log entries', async () => {
    await logger.info('Test message');

    expect(mockTransport.logs[0]!.timestamp).toBeDefined();
    expect(mockTransport.logs[0]!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should handle log transport errors gracefully', async () => {
    const failingTransport: LogTransport = {
      log: async () => {
        throw new Error('Transport error');
      },
    };

    logger.addTransport(failingTransport);

    // Should not throw
    await expect(logger.info('Test message')).resolves.not.toThrow();

    // Mock transport should still receive the log
    expect(mockTransport.logs).toHaveLength(1);
  });

  it('should call flush on all transports', async () => {
    const flushSpy = vi.spyOn(mockTransport, 'flush');

    await logger.flush();

    expect(flushSpy).toHaveBeenCalled();
  });
});

describe('ConsoleTransport', () => {
  it('should log to console in text format', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const transport = new ConsoleTransport('text');

    const entry: LogEntry = {
      timestamp: '2025-12-05T12:00:00.000Z',
      level: 'INFO',
      message: 'Test message',
      category: 'test',
    };

    transport.log(entry);

    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0]![0] as string;
    expect(logMessage).toContain('INFO');
    expect(logMessage).toContain('Test message');

    consoleSpy.mockRestore();
  });

  it('should log to console in JSON format', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const transport = new ConsoleTransport('json');

    const entry: LogEntry = {
      timestamp: '2025-12-05T12:00:00.000Z',
      level: 'INFO',
      message: 'Test message',
      category: 'test',
    };

    transport.log(entry);

    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(logMessage);
    expect(parsed).toMatchObject(entry);

    consoleSpy.mockRestore();
  });

  it('should use console.error for ERROR and FATAL', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const transport = new ConsoleTransport('text');

    const entry: LogEntry = {
      timestamp: '2025-12-05T12:00:00.000Z',
      level: 'ERROR',
      message: 'Error message',
      category: 'test',
    };

    transport.log(entry);

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('LogLevel enum', () => {
  it('should have correct ordering', () => {
    expect(LogLevel.DEBUG).toBeLessThan(LogLevel.INFO);
    expect(LogLevel.INFO).toBeLessThan(LogLevel.WARN);
    expect(LogLevel.WARN).toBeLessThan(LogLevel.ERROR);
    expect(LogLevel.ERROR).toBeLessThan(LogLevel.FATAL);
  });
});
