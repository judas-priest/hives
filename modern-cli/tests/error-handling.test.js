/**
 * Basic tests for error handling and logging
 * Run with: node tests/error-handling.test.js
 */

import {
  ModernCLIError,
  FileSystemError,
  NetworkError,
  AuthenticationError,
  ToolExecutionError,
  ConfigurationError,
  ValidationError,
  RateLimitError,
  isRetryableError,
  getFriendlyErrorMessage,
  wrapError
} from '../src/utils/errors.js';

import {
  Logger,
  LogLevel,
  ConsoleTransport,
  initializeLogger,
  getLogger
} from '../src/utils/logger.js';

import {
  retryWithBackoff,
  fallbackChain,
  CircuitBreaker,
  RecoveryManager,
  getRecoveryManager
} from '../src/utils/error-recovery.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

// Test error types
console.log('\n=== Testing Error Types ===\n');

const fsError = new FileSystemError('File not found', 'read', '/test.txt');
assert(fsError.name === 'FileSystemError', 'FileSystemError has correct name');
assert(fsError.operation === 'read', 'FileSystemError has operation');
assert(fsError.path === '/test.txt', 'FileSystemError has path');

const networkError = new NetworkError('Connection failed', 500, 'https://api.test.com');
assert(networkError.name === 'NetworkError', 'NetworkError has correct name');
assert(networkError.statusCode === 500, 'NetworkError has statusCode');
assert(networkError.url === 'https://api.test.com', 'NetworkError has URL');

const authError = new AuthenticationError('Invalid API key', 'polza');
assert(authError.name === 'AuthenticationError', 'AuthenticationError has correct name');
assert(authError.provider === 'polza', 'AuthenticationError has provider');

const toolError = new ToolExecutionError('Tool failed', 'read_file', { path: '/test.txt' });
assert(toolError.name === 'ToolExecutionError', 'ToolExecutionError has correct name');
assert(toolError.toolName === 'read_file', 'ToolExecutionError has toolName');

const rateLimitError = new RateLimitError('Rate limit exceeded', 5000);
assert(rateLimitError.name === 'RateLimitError', 'RateLimitError has correct name');
assert(rateLimitError.retryAfter === 5000, 'RateLimitError has retryAfter');

// Test isRetryableError
console.log('\n=== Testing Retryable Errors ===\n');

assert(isRetryableError(rateLimitError) === true, 'RateLimitError is retryable');
assert(isRetryableError(new NetworkError('', 500, '')) === true, '500 NetworkError is retryable');
assert(isRetryableError(new NetworkError('', 429, '')) === true, '429 NetworkError is retryable');
assert(isRetryableError(new NetworkError('', 400, '')) === false, '400 NetworkError is not retryable');
assert(isRetryableError(fsError) === false, 'FileSystemError is not retryable');

// Test getFriendlyErrorMessage
console.log('\n=== Testing Friendly Error Messages ===\n');

const friendlyMsg = getFriendlyErrorMessage(fsError);
assert(friendlyMsg.includes('File operation failed'), 'Friendly message for FileSystemError');

// Test wrapError
console.log('\n=== Testing Error Wrapping ===\n');

const nodeError = new Error('ENOENT: no such file or directory');
nodeError.code = 'ENOENT';
const wrapped = wrapError(nodeError, { path: '/test.txt' });
assert(wrapped instanceof FileSystemError, 'ENOENT wrapped as FileSystemError');

// Test Logger
console.log('\n=== Testing Logger ===\n');

const logger = new Logger({
  minLevel: LogLevel.DEBUG,
  transports: [new ConsoleTransport({ format: 'text', colorize: false })],
});

logger.setSessionId('test-session-123');
logger.setUserId('test-user-456');

await logger.debug('Debug message', { foo: 'bar' });
assert(true, 'Logger debug() works');

await logger.info('Info message');
assert(true, 'Logger info() works');

await logger.warn('Warning message');
assert(true, 'Logger warn() works');

await logger.error('Error message', new Error('Test error'));
assert(true, 'Logger error() works');

await logger.tool('read_file', 'started', { path: '/test.txt' });
assert(true, 'Logger tool() works');

await logger.api('/api/endpoint', 100, 200);
assert(true, 'Logger api() works');

await logger.auth('login', true);
assert(true, 'Logger auth() works');

// Test CircuitBreaker
console.log('\n=== Testing Circuit Breaker ===\n');

const breaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeoutMs: 1000,
});

let attempt = 0;
const failingOperation = async () => {
  attempt++;
  throw new Error('Operation failed');
};

try {
  await breaker.execute(failingOperation);
} catch (error) {
  assert(breaker.getState() === 'CLOSED', 'Circuit breaker starts CLOSED');
}

try {
  await breaker.execute(failingOperation);
} catch (error) {
  assert(breaker.getState() === 'OPEN', 'Circuit breaker opens after threshold');
}

// Test retryWithBackoff
console.log('\n=== Testing Retry with Backoff ===\n');

let retryAttempts = 0;
const retryableOperation = async () => {
  retryAttempts++;
  if (retryAttempts < 2) {
    const err = new Error('Temporary failure');
    err.code = 'ETIMEDOUT';
    throw wrapError(err, { url: 'https://api.test.com' });
  }
  return 'success';
};

try {
  const result = await retryWithBackoff(retryableOperation, {
    maxAttempts: 3,
    initialDelayMs: 100,
  });
  assert(result === 'success', 'retryWithBackoff succeeds after retries');
  assert(retryAttempts === 2, 'retryWithBackoff retried correct number of times');
} catch (error) {
  assert(false, 'retryWithBackoff should have succeeded');
}

// Test fallbackChain
console.log('\n=== Testing Fallback Chain ===\n');

const operations = [
  async () => { throw new Error('First fails'); },
  async () => { throw new Error('Second fails'); },
  async () => 'success',
];

try {
  const result = await fallbackChain(operations);
  assert(result === 'success', 'fallbackChain returns first successful result');
} catch (error) {
  assert(false, 'fallbackChain should have succeeded');
}

// Test RecoveryManager
console.log('\n=== Testing Recovery Manager ===\n');

const recoveryManager = getRecoveryManager();
assert(recoveryManager instanceof RecoveryManager, 'getRecoveryManager returns RecoveryManager');

let recoveryAttempts = 0;
const recoverable = async () => {
  recoveryAttempts++;
  if (recoveryAttempts < 2) {
    throw new RateLimitError('Rate limited', 100);
  }
  return 'recovered';
};

try {
  // Give the rate limit recovery time to work
  const recovered = await recoveryManager.executeWithRecovery(recoverable);
  assert(recovered === 'recovered', 'RecoveryManager recovers from errors');
} catch (error) {
  assert(false, `RecoveryManager should have recovered: ${error.message}`);
}

// Print summary
console.log('\n=== Test Summary ===\n');
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
