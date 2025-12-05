/**
 * Error Types and Utilities for Modern CLI
 * Comprehensive error handling system
 */

/**
 * Base error class for Modern CLI
 */
export class ModernCLIError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ModernCLIError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * File system related errors
 */
export class FileSystemError extends ModernCLIError {
  constructor(message, operation, path, details = {}) {
    super(message, 'FILE_SYSTEM_ERROR', { operation, path, ...details });
    this.name = 'FileSystemError';
    this.operation = operation;
    this.path = path;
  }
}

/**
 * Network/API related errors
 */
export class NetworkError extends ModernCLIError {
  constructor(message, statusCode, url, details = {}) {
    super(message, 'NETWORK_ERROR', { statusCode, url, ...details });
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends ModernCLIError {
  constructor(message, provider, details = {}) {
    super(message, 'AUTHENTICATION_ERROR', { provider, ...details });
    this.name = 'AuthenticationError';
    this.provider = provider;
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends ModernCLIError {
  constructor(message, toolName, args, details = {}) {
    super(message, 'TOOL_EXECUTION_ERROR', { toolName, args, ...details });
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.args = args;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends ModernCLIError {
  constructor(message, configKey, details = {}) {
    super(message, 'CONFIGURATION_ERROR', { configKey, ...details });
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ModernCLIError {
  constructor(message, field, value, details = {}) {
    super(message, 'VALIDATION_ERROR', { field, value, ...details });
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ModernCLIError {
  constructor(message, retryAfter, details = {}) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter, ...details });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error utility functions
 */

/**
 * Check if error is retryable
 */
export function isRetryableError(error) {
  if (error instanceof RateLimitError) return true;
  if (error instanceof NetworkError) {
    // Retry on 5xx errors and some 4xx errors
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.statusCode);
  }
  return false;
}

/**
 * Get user-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  if (error instanceof FileSystemError) {
    return `File operation failed: ${error.message} (${error.path})`;
  }
  if (error instanceof NetworkError) {
    return `Network error: ${error.message} (Status: ${error.statusCode})`;
  }
  if (error instanceof AuthenticationError) {
    return `Authentication failed: ${error.message}`;
  }
  if (error instanceof ToolExecutionError) {
    return `Tool '${error.toolName}' failed: ${error.message}`;
  }
  if (error instanceof ConfigurationError) {
    return `Configuration error: ${error.message}`;
  }
  if (error instanceof ValidationError) {
    return `Validation error: ${error.message} (field: ${error.field})`;
  }
  if (error instanceof RateLimitError) {
    return `Rate limit exceeded: ${error.message}. Retry after ${error.retryAfter}ms`;
  }
  if (error instanceof ModernCLIError) {
    return `Error: ${error.message}`;
  }
  return error.message || 'An unexpected error occurred';
}

/**
 * Convert standard Error to ModernCLIError
 */
export function wrapError(error, context = {}) {
  if (error instanceof ModernCLIError) {
    return error;
  }

  // Detect error type from error message or code
  const message = error.message || 'Unknown error';
  const code = error.code;

  // File system errors
  if (code === 'ENOENT') {
    return new FileSystemError('File or directory not found', 'read', context.path || 'unknown', { originalError: message });
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return new FileSystemError('Permission denied', context.operation || 'access', context.path || 'unknown', { originalError: message });
  }
  if (code === 'EEXIST') {
    return new FileSystemError('File already exists', 'write', context.path || 'unknown', { originalError: message });
  }

  // Network errors
  if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
    return new NetworkError(message, 0, context.url || 'unknown', { originalError: message, code });
  }

  // Default to generic error
  return new ModernCLIError(message, 'UNKNOWN_ERROR', { originalError: message, code, ...context });
}

/**
 * Error reporter - logs errors to file
 */
export class ErrorReporter {
  constructor(logDir = null) {
    this.logDir = logDir;
  }

  /**
   * Report an error
   */
  async report(error, context = {}) {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: error instanceof ModernCLIError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: {
        ...context,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      },
    };

    // If log directory is specified, write to file
    if (this.logDir) {
      try {
        const { writeFileSync, mkdirSync, existsSync } = await import('fs');
        const { join } = await import('path');

        if (!existsSync(this.logDir)) {
          mkdirSync(this.logDir, { recursive: true });
        }

        const filename = `error-${Date.now()}.json`;
        const filepath = join(this.logDir, filename);

        writeFileSync(filepath, JSON.stringify(errorReport, null, 2));

        return filepath;
      } catch (writeError) {
        console.error('Failed to write error report:', writeError.message);
      }
    }

    return null;
  }
}
