/**
 * Structured Logging System for Modern CLI
 * Multi-level logging with file and console transports
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, appendFileSync, renameSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

/**
 * Log levels (ordered by severity)
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

const LogLevelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

/**
 * Base Transport interface
 */
class Transport {
  async write(entry) {
    throw new Error('Transport.write() must be implemented');
  }

  async flush() {
    // Optional: implement if buffering is needed
  }
}

/**
 * Console Transport
 */
export class ConsoleTransport extends Transport {
  constructor(options = {}) {
    super();
    this.format = options.format || 'text'; // 'text' or 'json'
    this.colorize = options.colorize !== false;
  }

  async write(entry) {
    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
      return;
    }

    // Text format with colors
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevelNames[entry.level];
    const prefix = `[${timestamp}] [${level}]`;

    let coloredPrefix = prefix;
    if (this.colorize) {
      switch (entry.level) {
        case LogLevel.DEBUG:
          coloredPrefix = chalk.gray(prefix);
          break;
        case LogLevel.INFO:
          coloredPrefix = chalk.blue(prefix);
          break;
        case LogLevel.WARN:
          coloredPrefix = chalk.yellow(prefix);
          break;
        case LogLevel.ERROR:
          coloredPrefix = chalk.red(prefix);
          break;
        case LogLevel.FATAL:
          coloredPrefix = chalk.bgRed.white(prefix);
          break;
      }
    }

    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';

    console.log(`${coloredPrefix} ${entry.message}${contextStr}`);

    if (entry.error && entry.error.stack) {
      console.log(chalk.gray(entry.error.stack));
    }
  }
}

/**
 * File Transport with rotation
 */
export class FileTransport extends Transport {
  constructor(options = {}) {
    super();
    this.logDir = options.logDir || join(process.cwd(), 'logs');
    this.filename = options.filename || 'modern-cli.log';
    this.maxSizeMB = options.maxSizeMB || 10;
    this.maxFiles = options.maxFiles || 5;
    this.buffer = [];
    this.bufferSize = options.bufferSize || 10;

    // Create log directory if it doesn't exist
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  get logPath() {
    return join(this.logDir, this.filename);
  }

  async write(entry) {
    this.buffer.push(entry);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    try {
      // Check if rotation is needed
      this.rotateIfNeeded();

      // Write buffered entries
      const entries = this.buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      this.buffer = [];

      // Append to log file
      appendFileSync(this.logPath, entries);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  rotateIfNeeded() {
    try {
      if (!existsSync(this.logPath)) return;

      const stats = statSync(this.logPath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB >= this.maxSizeMB) {
        this.rotate();
      }
    } catch (error) {
      console.error('Failed to check log file size:', error.message);
    }
  }

  rotate() {
    try {
      // Rename current log file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFilename = `${this.filename}.${timestamp}`;
      const rotatedPath = join(this.logDir, rotatedFilename);

      renameSync(this.logPath, rotatedPath);

      // Clean up old log files
      this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  cleanupOldLogs() {
    try {
      const files = readdirSync(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith(this.filename) && f !== this.filename)
        .map(f => ({
          name: f,
          path: join(this.logDir, f),
          mtime: statSync(join(this.logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

      // Remove oldest files if we exceed maxFiles
      if (logFiles.length > this.maxFiles) {
        const filesToRemove = logFiles.slice(this.maxFiles);
        for (const file of filesToRemove) {
          unlinkSync(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error.message);
    }
  }
}

/**
 * Structured Logger
 */
export class Logger {
  constructor(options = {}) {
    this.minLevel = options.minLevel || LogLevel.INFO;
    this.transports = options.transports || [new ConsoleTransport()];
    this.sessionId = options.sessionId || null;
    this.userId = options.userId || null;
    this.defaultCategory = options.defaultCategory || 'general';
  }

  setMinLevel(level) {
    if (typeof level === 'string') {
      this.minLevel = LogLevel[level.toUpperCase()] ?? LogLevel.INFO;
    } else {
      this.minLevel = level;
    }
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  addTransport(transport) {
    this.transports.push(transport);
  }

  async log(level, message, context = {}, error = null, category = null) {
    if (level < this.minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevelNames[level],
      message,
      category: category || this.defaultCategory,
      context: {
        ...context,
        ...(this.sessionId && { sessionId: this.sessionId }),
        ...(this.userId && { userId: this.userId }),
      },
      ...(error && { error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error.code && { code: error.code }),
      }}),
    };

    // Write to all transports
    for (const transport of this.transports) {
      try {
        await transport.write(entry);
      } catch (err) {
        console.error('Transport write failed:', err.message);
      }
    }
  }

  async debug(message, context = {}) {
    await this.log(LogLevel.DEBUG, message, context);
  }

  async info(message, context = {}) {
    await this.log(LogLevel.INFO, message, context);
  }

  async warn(message, context = {}) {
    await this.log(LogLevel.WARN, message, context);
  }

  async error(message, error = null, context = {}) {
    await this.log(LogLevel.ERROR, message, context, error);
  }

  async fatal(message, error = null, context = {}) {
    await this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Specialized loggers
   */

  async tool(toolName, action, context = {}) {
    await this.log(LogLevel.INFO, `Tool ${toolName}: ${action}`, context, null, 'tool');
  }

  async auth(action, success, context = {}) {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    await this.log(level, `Auth: ${action} - ${success ? 'success' : 'failed'}`, context, null, 'auth');
  }

  async api(endpoint, duration, statusCode = null, context = {}) {
    const level = statusCode && statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    await this.log(level, `API: ${endpoint}`, {
      ...context,
      duration,
      statusCode,
    }, null, 'api');
  }

  async flush() {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger = null;

/**
 * Initialize global logger
 */
export function initializeLogger(logDir = null, minLevel = 'INFO') {
  const transports = [new ConsoleTransport()];

  if (logDir) {
    transports.push(new FileTransport({ logDir }));
  }

  globalLogger = new Logger({
    minLevel: LogLevel[minLevel.toUpperCase()] || LogLevel.INFO,
    transports,
  });

  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger() {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}
