/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Log output format
 */
export type LogFormat = 'text' | 'json';

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: keyof typeof LogLevel;
  message: string;
  category: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  sessionId?: string;
  userId?: string;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  log(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void>;
}

/**
 * Console transport
 */
export class ConsoleTransport implements LogTransport {
  constructor(private format: LogFormat = 'text') {}

  log(entry: LogEntry): void {
    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const levelStr = entry.level.padEnd(5);
      const categoryStr = entry.category ? `[${entry.category}]` : '';
      const message = `[${entry.timestamp}] ${levelStr} ${categoryStr} ${entry.message}`;

      switch (entry.level) {
        case 'DEBUG':
          console.debug(message, entry.context || '');
          break;
        case 'INFO':
          console.info(message, entry.context || '');
          break;
        case 'WARN':
          console.warn(message, entry.context || '');
          break;
        case 'ERROR':
        case 'FATAL':
          console.error(message, entry.error || entry.context || '');
          break;
      }
    }
  }
}

/**
 * File transport with rotation
 */
export class FileTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private writePromise: Promise<void> = Promise.resolve();

  constructor(
    private logDirectory: string,
    private maxSizeMB: number = 10,
    private maxFiles: number = 5,
  ) {}

  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);

    // Flush buffer every 10 entries or immediately for errors
    if (this.buffer.length >= 10 || entry.level === 'ERROR' || entry.level === 'FATAL') {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entriesToWrite = [...this.buffer];
    this.buffer = [];

    // Chain write operations to prevent race conditions
    this.writePromise = this.writePromise.then(async () => {
      try {
        await this.writeEntries(entriesToWrite);
      } catch (error) {
        console.error('Failed to write log entries:', error);
      }
    });

    await this.writePromise;
  }

  private async writeEntries(entries: LogEntry[]): Promise<void> {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logDirectory, { recursive: true });

      const logFile = path.join(this.logDirectory, 'gemini-cli.log');
      const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';

      // Check file size and rotate if needed
      try {
        const stats = await fs.stat(logFile);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB >= this.maxSizeMB) {
          await this.rotateLogFiles();
        }
      } catch {
        // File doesn't exist yet, that's fine
      }

      // Append to log file
      await fs.appendFile(logFile, content, 'utf-8');
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  private async rotateLogFiles(): Promise<void> {
    const logFile = path.join(this.logDirectory, 'gemini-cli.log');

    // Rotate existing backup files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldFile = path.join(this.logDirectory, `gemini-cli.log.${i}`);
      const newFile = path.join(this.logDirectory, `gemini-cli.log.${i + 1}`);

      try {
        await fs.rename(oldFile, newFile);
      } catch {
        // File might not exist
      }
    }

    // Move current log to .1
    try {
      const backupFile = path.join(this.logDirectory, 'gemini-cli.log.1');
      await fs.rename(logFile, backupFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

/**
 * Structured logger with multiple transports
 */
export class StructuredLogger {
  private minLevel: LogLevel = LogLevel.INFO;
  private transports: LogTransport[] = [];
  private sessionId?: string;
  private userId?: string;

  constructor() {
    // Default console transport
    this.transports.push(new ConsoleTransport('text'));
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: keyof typeof LogLevel): void {
    this.minLevel = LogLevel[level];
  }

  /**
   * Set session ID for all log entries
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Set user ID for all log entries
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * Remove all transports
   */
  clearTransports(): void {
    this.transports = [];
  }

  /**
   * Log a message
   */
  private async logEntry(
    level: keyof typeof LogLevel,
    message: string,
    category: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): Promise<void> {
    // Check if this log level should be logged
    if (LogLevel[level] < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      context,
      sessionId: this.sessionId,
      userId: this.userId,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Write to all transports
    await Promise.all(
      this.transports.map(async (transport) => {
        try {
          await transport.log(entry);
        } catch (err) {
          console.error('Transport error:', err);
        }
      }),
    );
  }

  /**
   * Debug level log
   */
  async debug(
    message: string,
    category = 'general',
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEntry('DEBUG', message, category, context);
  }

  /**
   * Info level log
   */
  async info(
    message: string,
    category = 'general',
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEntry('INFO', message, category, context);
  }

  /**
   * Warning level log
   */
  async warn(
    message: string,
    category = 'general',
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEntry('WARN', message, category, context);
  }

  /**
   * Error level log
   */
  async error(
    message: string,
    error?: Error,
    category = 'general',
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEntry('ERROR', message, category, context, error);
  }

  /**
   * Fatal level log
   */
  async fatal(
    message: string,
    error?: Error,
    category = 'general',
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.logEntry('FATAL', message, category, context, error);
  }

  /**
   * Log tool execution
   */
  async tool(
    toolName: string,
    action: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.info(`Tool ${toolName}: ${action}`, 'tool', context);
  }

  /**
   * Log authentication event
   */
  async auth(
    action: string,
    success: boolean,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const level = success ? 'INFO' : 'WARN';
    await this.logEntry(level, `Auth ${action}: ${success ? 'success' : 'failed'}`, 'auth', context);
  }

  /**
   * Log API call
   */
  async api(
    endpoint: string,
    duration: number,
    statusCode?: number,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.info(
      `API call to ${endpoint}`,
      'api',
      { duration, statusCode, ...context },
    );
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(async (transport) => {
        if (transport.flush) {
          try {
            await transport.flush();
          } catch (err) {
            console.error('Transport flush error:', err);
          }
        }
      }),
    );
  }
}

/**
 * Global structured logger instance
 */
export const logger = new StructuredLogger();

/**
 * Initialize logger with file transport
 */
export function initializeLogger(
  logDirectory?: string,
  minLevel: keyof typeof LogLevel = 'INFO',
): StructuredLogger {
  logger.setMinLevel(minLevel);

  if (logDirectory) {
    const fileTransport = new FileTransport(logDirectory);
    logger.addTransport(fileTransport);
  }

  return logger;
}
