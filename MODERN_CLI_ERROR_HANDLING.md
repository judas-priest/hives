# Modern CLI - Error Handling and Logging

**Date:** December 5, 2025
**Issue Reference:** https://github.com/judas-priest/hives/issues/134
**PR:** https://github.com/judas-priest/hives/pull/137

---

## Overview

This document describes the comprehensive error handling and logging system added to Modern CLI. The implementation provides robust error handling, structured logging, and automatic error recovery mechanisms.

---

## 🎯 Key Features

### 1. Typed Error System
- **7 specialized error types** for different failure scenarios
- **User-friendly error messages** with context
- **Error wrapping** to convert standard errors to typed errors
- **JSON serialization** for error reporting

### 2. Structured Logging
- **5 log levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Multiple transports**: Console and file with rotation
- **Specialized loggers** for tools, API calls, and authentication
- **Session and user tracking**
- **Async buffering** for performance

### 3. Error Recovery
- **Retry with exponential backoff** for transient failures
- **Fallback chains** for alternative operations
- **Circuit breaker pattern** to prevent cascading failures
- **Recovery strategies** for network and rate limit errors

---

## 📁 New Files

### Core Error Handling
- `modern-cli/src/utils/errors.js` - Error types and utilities (235 lines)
- `modern-cli/src/utils/logger.js` - Structured logging system (327 lines)
- `modern-cli/src/utils/error-recovery.js` - Recovery mechanisms (268 lines)

### Tests
- `modern-cli/tests/error-handling.test.js` - Comprehensive tests (200+ lines)

### Documentation
- `MODERN_CLI_ERROR_HANDLING.md` - This file

**Total:** 5 new files, ~1,030+ lines of code

---

## 🔧 Error Types

### ModernCLIError
Base error class with error code, details, and timestamp.

```javascript
import { ModernCLIError } from './utils/errors.js';

throw new ModernCLIError('Something went wrong', 'ERROR_CODE', {
  additionalInfo: 'value'
});
```

### FileSystemError
For file and directory operations.

```javascript
import { FileSystemError } from './utils/errors.js';

throw new FileSystemError(
  'File not found',
  'read',           // operation
  '/path/to/file'   // path
);
```

### NetworkError
For HTTP requests and network issues.

```javascript
import { NetworkError } from './utils/errors.js';

throw new NetworkError(
  'Request failed',
  500,              // statusCode
  'https://api.example.com'  // url
);
```

### AuthenticationError
For authentication and authorization failures.

```javascript
import { AuthenticationError } from './utils/errors.js';

throw new AuthenticationError(
  'Invalid API key',
  'polza'           // provider
);
```

### ToolExecutionError
For tool call failures.

```javascript
import { ToolExecutionError } from './utils/errors.js';

throw new ToolExecutionError(
  'Tool failed',
  'read_file',      // toolName
  { path: '/test' } // args
);
```

### RateLimitError
For rate limiting scenarios.

```javascript
import { RateLimitError } from './utils/errors.js';

throw new RateLimitError(
  'Rate limit exceeded',
  5000              // retryAfter (ms)
);
```

### ConfigurationError & ValidationError
For configuration and validation issues.

---

## 📊 Structured Logging

### Basic Usage

```javascript
import { initializeLogger, getLogger } from './utils/logger.js';

// Initialize logger (once at startup)
initializeLogger('~/.hives-cli/logs', 'INFO');

// Get logger instance
const logger = getLogger();

// Log messages
await logger.debug('Debug information', { foo: 'bar' });
await logger.info('Information message');
await logger.warn('Warning message');
await logger.error('Error occurred', error);
await logger.fatal('Fatal error', error);
```

### Specialized Logging

```javascript
// Log tool execution
await logger.tool('read_file', 'started', { path: '/test.txt' });
await logger.tool('read_file', 'completed', { duration: 123 });

// Log API calls
await logger.api('/chat/completions', 1234, 200, {
  model: 'claude-3.5',
  tokens: 1000
});

// Log authentication
await logger.auth('login', true);
await logger.auth('api_key_validation', false);
```

### Custom Logger

```javascript
import { Logger, LogLevel, ConsoleTransport, FileTransport } from './utils/logger.js';

const logger = new Logger({
  minLevel: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ format: 'json', colorize: true }),
    new FileTransport({
      logDir: './logs',
      maxSizeMB: 10,
      maxFiles: 5
    })
  ]
});

logger.setSessionId('session-123');
logger.setUserId('user-456');
```

### Log Levels

| Level | Value | Description |
|-------|-------|-------------|
| DEBUG | 0 | Detailed debugging information |
| INFO  | 1 | General informational messages |
| WARN  | 2 | Warning messages |
| ERROR | 3 | Error messages |
| FATAL | 4 | Fatal errors causing termination |

### File Transport with Rotation

The file transport automatically rotates logs when they exceed the maximum size:

```javascript
new FileTransport({
  logDir: '~/.hives-cli/logs',
  filename: 'modern-cli.log',
  maxSizeMB: 10,          // Rotate at 10MB
  maxFiles: 5,            // Keep 5 rotated files
  bufferSize: 10          // Buffer 10 entries before writing
})
```

---

## 🔄 Error Recovery

### Retry with Exponential Backoff

```javascript
import { retryWithBackoff } from './utils/error-recovery.js';

const result = await retryWithBackoff(
  async () => {
    // Your operation that might fail
    return await fetch('https://api.example.com');
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    onRetry: (attempt, maxAttempts, error, delay) => {
      console.log(`Retry ${attempt}/${maxAttempts} in ${delay}ms...`);
    }
  }
);
```

### Fallback Chain

```javascript
import { fallbackChain } from './utils/error-recovery.js';

const result = await fallbackChain([
  async () => await primaryOperation(),
  async () => await secondaryOperation(),
  async () => await fallbackOperation()
]);
```

### Circuit Breaker

```javascript
import { CircuitBreaker } from './utils/error-recovery.js';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenAttempts: 1
});

const result = await breaker.execute(async () => {
  return await unreliableOperation();
});
```

Circuit states:
- **CLOSED**: Normal operation
- **OPEN**: Too many failures, rejecting immediately
- **HALF_OPEN**: Testing if service recovered

### Recovery Manager

```javascript
import { getRecoveryManager } from './utils/error-recovery.js';

const recovery = getRecoveryManager();

// Automatic recovery with registered strategies
const result = await recovery.executeWithRecovery(async () => {
  return await operation();
});

// Circuit breaker by name
const data = await recovery.withCircuitBreaker('api-call', async () => {
  return await fetchAPI();
});
```

---

## 🔌 Integration Examples

### Polza Client Integration

The Polza client now includes:
- **Automatic error wrapping** to typed errors
- **API call logging** with timing
- **Automatic retry** for transient failures
- **Rate limit handling** with exponential backoff

```javascript
import { PolzaClient } from './lib/polza-client.js';

const client = new PolzaClient(apiKey);

try {
  const response = await client.chat('Hello', {
    model: 'claude-3.5',
    tools: tools
  });
} catch (error) {
  // Error is automatically wrapped and logged
  if (error instanceof RateLimitError) {
    console.log(`Rate limited, retry after ${error.retryAfter}ms`);
  }
}
```

### Tool Handlers Integration

All tool handlers now include:
- **Debug logging** for operations
- **Error wrapping** to FileSystemError/NetworkError
- **Operation timing** in logs
- **Detailed error context**

```javascript
import { getToolHandlers } from './lib/tools.js';

const handlers = getToolHandlers(yoloMode);

// Tools automatically log and wrap errors
const result = await handlers.read_file({ path: '/test.txt' });

if (!result.success) {
  console.log(`Error: ${result.error}`);
  console.log(`Code: ${result.code}`);
}
```

---

## 🧪 Testing

Run the test suite:

```bash
cd modern-cli
node tests/error-handling.test.js
```

Tests cover:
- ✅ All error types
- ✅ Error wrapping and utilities
- ✅ Logger with all log levels
- ✅ Specialized loggers (tool, api, auth)
- ✅ Circuit breaker states
- ✅ Retry with backoff
- ✅ Fallback chains
- ✅ Recovery manager

---

## 📈 Benefits

### For Developers
- **Better debugging**: Structured logs with context and timing
- **Type safety**: Typed errors prevent bugs
- **Automatic recovery**: Transient failures handled automatically
- **Clear error messages**: User-friendly error descriptions

### For Operations
- **Observability**: Comprehensive logging for monitoring
- **Resilience**: Circuit breakers prevent cascading failures
- **Log rotation**: Prevents disk space issues
- **Performance tracking**: Timing data for all operations

### For Users
- **Better error messages**: Clear descriptions with suggestions
- **Automatic retries**: Transient issues handled transparently
- **Reliability**: More robust error handling
- **Transparency**: Clear logging of operations

---

## 🔍 Error Utilities

### isRetryableError()

Check if an error can be retried:

```javascript
import { isRetryableError } from './utils/errors.js';

if (isRetryableError(error)) {
  // Retry the operation
}
```

Retryable errors:
- RateLimitError
- NetworkError with status 429, 500-504, 408

### getFriendlyErrorMessage()

Get user-friendly error message:

```javascript
import { getFriendlyErrorMessage } from './utils/errors.js';

const message = getFriendlyErrorMessage(error);
console.log(message);
```

### wrapError()

Convert standard Error to typed error:

```javascript
import { wrapError } from './utils/errors.js';

try {
  readFileSync('/nonexistent.txt');
} catch (error) {
  const wrapped = wrapError(error, { path: '/nonexistent.txt' });
  // wrapped is now a FileSystemError
}
```

Automatic detection:
- `ENOENT` → FileSystemError (not found)
- `EACCES`, `EPERM` → FileSystemError (permission denied)
- `EEXIST` → FileSystemError (already exists)
- `ENOTFOUND`, `ETIMEDOUT` → NetworkError

---

## ⚙️ Configuration

### Logger Configuration

Environment variables:
- `LOG_LEVEL` - Minimum log level (DEBUG, INFO, WARN, ERROR, FATAL)
- `LOG_DIR` - Directory for log files
- `LOG_FORMAT` - Format (text or json)

### Recovery Configuration

Configure recovery behavior:

```javascript
const recovery = new RecoveryManager();

recovery.registerStrategy(new CustomRecoveryStrategy());

await recovery.retryWithBackoff(operation, {
  maxAttempts: 5,
  initialDelayMs: 2000,
  backoffMultiplier: 1.5,
  maxDelayMs: 60000
});
```

---

## 🚀 Future Enhancements

Potential improvements:
1. **Error Analytics** - Track error patterns and frequencies
2. **Remote Logging** - Send logs to external service
3. **Error Reporting** - Automatic bug reports with context
4. **Metrics** - Prometheus-style metrics
5. **Alerts** - Email/Slack alerts for critical errors
6. **Error History** - Track error trends over time

---

## 📚 API Reference

### Error Classes

```javascript
class ModernCLIError extends Error
class FileSystemError extends ModernCLIError
class NetworkError extends ModernCLIError
class AuthenticationError extends ModernCLIError
class ToolExecutionError extends ModernCLIError
class ConfigurationError extends ModernCLIError
class ValidationError extends ModernCLIError
class RateLimitError extends ModernCLIError
```

### Logger Classes

```javascript
class Logger {
  async debug(message, context)
  async info(message, context)
  async warn(message, context)
  async error(message, error, context)
  async fatal(message, error, context)
  async tool(toolName, action, context)
  async api(endpoint, duration, statusCode, context)
  async auth(action, success, context)
  setSessionId(sessionId)
  setUserId(userId)
  setMinLevel(level)
  addTransport(transport)
}

class ConsoleTransport extends Transport
class FileTransport extends Transport
```

### Recovery Classes

```javascript
class CircuitBreaker {
  async execute(operation)
  getState()
  reset()
}

class RecoveryManager {
  registerStrategy(strategy)
  async executeWithRecovery(operation, context)
  async retryWithBackoff(operation, options)
  async fallbackChain(operations)
  async withCircuitBreaker(name, operation, options)
}
```

### Utility Functions

```javascript
function isRetryableError(error): boolean
function getFriendlyErrorMessage(error): string
function wrapError(error, context): ModernCLIError
function initializeLogger(logDir, minLevel): Logger
function getLogger(): Logger
function getRecoveryManager(): RecoveryManager
async function retryWithBackoff(operation, options): Promise
async function fallbackChain(operations): Promise
```

---

## 🎓 Examples

### Complete Error Handling Example

```javascript
import { PolzaClient } from './lib/polza-client.js';
import { getLogger, initializeLogger } from './utils/logger.js';
import { getRecoveryManager } from './utils/error-recovery.js';
import {
  NetworkError,
  RateLimitError,
  AuthenticationError,
  getFriendlyErrorMessage
} from './utils/errors.js';

// Initialize
initializeLogger('~/.hives-cli/logs', 'INFO');
const logger = getLogger();
const recovery = getRecoveryManager();

// Create client
const client = new PolzaClient(apiKey);

// Use with recovery
try {
  const response = await recovery.withCircuitBreaker(
    'polza-api',
    async () => {
      return await client.chat('Hello, how are you?', {
        model: 'claude-3.5',
        tools: getTools()
      });
    },
    { failureThreshold: 3, resetTimeoutMs: 30000 }
  );

  logger.info('Chat successful', {
    model: response.model,
    tokens: response.usage?.total_tokens
  });

  console.log(response.choices[0].message.content);
} catch (error) {
  logger.error('Chat failed', error);

  if (error instanceof RateLimitError) {
    console.error(`Rate limited. Please wait ${error.retryAfter}ms`);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed. Please check your API key.');
  } else if (error instanceof NetworkError) {
    console.error(`Network error: ${error.message}`);
  } else {
    console.error(getFriendlyErrorMessage(error));
  }

  process.exit(1);
}
```

---

## 📊 Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Error Types** | Generic Error | 7 specialized types |
| **Error Messages** | Technical | User-friendly |
| **Logging** | console.log | Structured logging |
| **Log Levels** | None | 5 levels |
| **Log Files** | No | Yes, with rotation |
| **Retry Logic** | Manual | Automatic |
| **Circuit Breaker** | No | Yes |
| **Error Recovery** | Manual | Automatic strategies |
| **API Timing** | No | Yes, logged |
| **Tool Logging** | No | Yes, with details |
| **Error Context** | Minimal | Comprehensive |

---

## ✅ Checklist for Integration

When integrating error handling into new code:

- [ ] Import error types from `./utils/errors.js`
- [ ] Import logger from `./utils/logger.js`
- [ ] Wrap operations in try-catch
- [ ] Use `wrapError()` for standard errors
- [ ] Log operations with appropriate level
- [ ] Use retry/recovery for transient failures
- [ ] Provide user-friendly error messages
- [ ] Include timing for performance tracking
- [ ] Test error scenarios

---

**Status:** ✅ Implemented and tested
**Next Steps:** Deploy to production, monitor logs, gather feedback

---

*Prepared for Issue #134 - Add error handling and logging to Modern CLI*
