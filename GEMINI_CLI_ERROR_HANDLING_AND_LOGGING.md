# Gemini CLI - Error Handling and Logging Analysis & Enhancements

**Analysis Date:** December 5, 2025
**Repository:** https://github.com/google-gemini/gemini-cli
**Issue Reference:** https://github.com/judas-priest/hives/issues/134
**PR:** https://github.com/judas-priest/hives/pull/136

---

## Executive Summary

This document analyzes the current error handling and logging infrastructure in Gemini CLI and proposes enhancements to make it even more robust and developer-friendly.

---

## 1. Current Error Handling Infrastructure

### 1.1 Error Types (`packages/core/src/utils/errors.ts`)

The Gemini CLI already has a comprehensive error type system:

```typescript
// Fatal Errors (with specific exit codes)
- FatalError: Base class with exitCode
- FatalAuthenticationError: exitCode 41
- FatalInputError: exitCode 42
- FatalSandboxError: exitCode 44
- FatalConfigError: exitCode 52
- FatalTurnLimitedError: exitCode 53
- FatalToolExecutionError: exitCode 54
- FatalCancellationError: exitCode 130

// Recoverable Errors
- CanceledError: Operation canceled
- ForbiddenError: Access forbidden
- UnauthorizedError: Authentication required
- BadRequestError: Invalid request
```

### 1.2 Tool Error Types (`packages/core/src/tools/tool-error.ts`)

Extensive tool-specific error categorization:

```typescript
// General Errors
- INVALID_TOOL_PARAMS
- UNKNOWN
- UNHANDLED_EXCEPTION
- TOOL_NOT_REGISTERED
- EXECUTION_FAILED

// File System Errors (13 types)
- FILE_NOT_FOUND
- FILE_WRITE_FAILURE
- PERMISSION_DENIED
- NO_SPACE_LEFT
- FILE_TOO_LARGE
- etc.

// Operation-Specific Errors
- Edit errors (5 types)
- Glob errors (1 type)
- Grep errors (1 type)
- Shell errors (1 type)
- MCP errors (1 type)
- WebFetch/WebSearch errors (4 types)
```

**Key Feature:** `isFatalToolError()` function distinguishes between recoverable and fatal errors.

### 1.3 Error Reporting (`packages/core/src/utils/errorReporting.ts`)

The `reportError()` function provides:
- Automatic error report generation
- JSON file export to temp directory
- Context preservation (chat history, request contents)
- Graceful fallbacks for stringification failures
- Console output with file path

### 1.4 Error Utilities (`packages/core/src/utils/errorParsing.ts`)

Helper functions for error handling:
- `isNodeError()`: Type guard for Node.js errors
- `getErrorMessage()`: Safe error message extraction
- `toFriendlyError()`: Converts HTTP errors to user-friendly messages
- HTTP status code mapping (400, 401, 403)

---

## 2. Current Logging Infrastructure

### 2.1 Debug Logger (`packages/core/src/utils/debugLogger.ts`)

Simple, centralized logging:

```typescript
class DebugLogger {
  log(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  debug(...args: unknown[]): void
}
```

**Key Features:**
- Single point of control
- Integrates with ConsolePatcher
- Routes to debug drawer UI
- Developer-facing messages

### 2.2 Telemetry System

The Gemini CLI has enterprise-grade telemetry:
- OpenTelemetry integration
- Event logging (tool usage, auth events, etc.)
- ClearcutLogger for Google analytics
- User consent management
- GDPR compliance

### 2.3 Console Patching

The UI includes a `ConsolePatcher` that intercepts console calls and routes them to the debug drawer, providing a non-intrusive debugging experience.

---

## 3. Strengths of Current Implementation

1. **Comprehensive Error Types**: 30+ specific error types covering all scenarios
2. **Exit Code Standardization**: Predictable exit codes for CI/CD integration
3. **Fatal/Recoverable Distinction**: LLM can self-correct recoverable errors
4. **Context Preservation**: Full error reports with chat history
5. **Enterprise Telemetry**: Production-ready logging and monitoring
6. **UI Integration**: Errors displayed in rich terminal UI
7. **Type Safety**: Full TypeScript typing prevents error handling bugs

---

## 4. Proposed Enhancements

### 4.1 Enhanced Error Context

**New File:** `packages/core/src/utils/enhancedErrorContext.ts`

```typescript
interface ErrorContext {
  // Existing
  timestamp: string;
  errorType: string;
  errorMessage: string;
  stack?: string;

  // New Enhancements
  sessionId: string;
  userId?: string;
  environment: {
    nodeVersion: string;
    platform: string;
    cliVersion: string;
    workingDirectory: string;
  };
  performanceMetrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
  };
  breadcrumbs: ErrorBreadcrumb[];
}

interface ErrorBreadcrumb {
  timestamp: string;
  category: 'tool' | 'command' | 'auth' | 'api';
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}
```

**Benefits:**
- Better debugging with breadcrumb trails
- Environment context for issue reproduction
- Performance correlation with errors
- Session tracking for multi-turn issues

### 4.2 Structured Logging

**New File:** `packages/core/src/utils/structuredLogger.ts`

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  category: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class StructuredLogger {
  // Log levels
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error, context?: Record<string, unknown>): void
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void

  // Specialized loggers
  tool(toolName: string, action: string, context?: Record<string, unknown>): void
  auth(action: string, success: boolean, context?: Record<string, unknown>): void
  api(endpoint: string, duration: number, statusCode?: number): void

  // Configuration
  setMinLevel(level: string): void
  setOutputFormat(format: 'text' | 'json'): void
  addTransport(transport: LogTransport): void
}
```

**Benefits:**
- Machine-readable logs (JSON format)
- Log level filtering
- Multiple output destinations
- Specialized logging for different subsystems
- Better integration with log aggregation tools

### 4.3 Error Recovery Strategies

**New File:** `packages/core/src/utils/errorRecovery.ts`

```typescript
interface RecoveryStrategy {
  canRecover(error: Error): boolean;
  recover(error: Error, context: ErrorContext): Promise<RecoveryResult>;
}

class ErrorRecoveryManager {
  // Built-in strategies
  registerStrategy(errorType: string, strategy: RecoveryStrategy): void

  // Common recovery patterns
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T>

  async fallbackChain<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T>

  async circuitBreaker<T>(
    operation: () => Promise<T>,
    options: CircuitBreakerOptions
  ): Promise<T>
}
```

**Recovery Strategies:**
1. **Network Errors**: Retry with exponential backoff
2. **Rate Limiting**: Wait and retry with quota tracking
3. **Authentication Errors**: Refresh tokens automatically
4. **File Conflicts**: Automatic conflict resolution
5. **Temporary Failures**: Circuit breaker pattern

### 4.4 Error Analytics

**New File:** `packages/core/src/utils/errorAnalytics.ts`

```typescript
class ErrorAnalytics {
  // Track error patterns
  trackError(error: Error, context: ErrorContext): void

  // Generate insights
  getMostCommonErrors(timeWindow: Duration): ErrorFrequency[]
  getErrorRate(timeWindow: Duration): number
  getRecoverySuccessRate(errorType: string): number

  // Alerts
  shouldAlert(errorType: string, frequency: number): boolean
  generateErrorReport(timeWindow: Duration): ErrorReport
}
```

**Benefits:**
- Identify error hotspots
- Track error trends
- Monitor recovery effectiveness
- Proactive issue detection

### 4.5 Contextual Error Messages

**New File:** `packages/core/src/utils/contextualErrorMessages.ts`

```typescript
class ContextualErrorMessageGenerator {
  generate(error: Error, context: ErrorContext): UserFriendlyMessage {
    return {
      title: string;
      explanation: string;
      possibleCauses: string[];
      suggestedActions: string[];
      helpLinks: string[];
      technicalDetails?: string;
    };
  }
}
```

**Example:**
```
❌ File Not Found

The file you're trying to read doesn't exist:
  /path/to/missing/file.js

Possible causes:
  • The file was moved or deleted
  • There's a typo in the file path
  • You don't have permission to see this file

Suggested actions:
  1. Check if the file path is correct
  2. Use 'ls' to list files in the directory
  3. Try using 'glob' to search for similar files

Learn more: https://geminicli.com/docs/errors/file-not-found
```

### 4.6 Error History and Patterns

**New File:** `packages/core/src/utils/errorHistory.ts`

```typescript
class ErrorHistoryTracker {
  // Track error occurrences
  recordError(error: Error, context: ErrorContext): void

  // Pattern detection
  detectRepeatingErrors(): RepeatingErrorPattern[]
  detectErrorCascades(): ErrorCascade[]
  detectAnomalies(): ErrorAnomaly[]

  // Historical analysis
  getErrorsBySession(sessionId: string): Error[]
  getErrorTrends(timeWindow: Duration): ErrorTrend[]
}
```

---

## 5. Implementation Priority

### Phase 1: Foundation (High Priority)
1. ✅ Document existing error handling (DONE - this document)
2. ⭕ Enhanced error context with breadcrumbs
3. ⭕ Structured logging system
4. ⭕ Contextual error messages

### Phase 2: Resilience (Medium Priority)
5. ⭕ Error recovery strategies
6. ⭕ Retry with backoff
7. ⭕ Circuit breaker pattern
8. ⭕ Error history tracking

### Phase 3: Analytics (Lower Priority)
9. ⭕ Error analytics and insights
10. ⭕ Pattern detection
11. ⭕ Automated alerting
12. ⭕ Error report generation

---

## 6. Testing Strategy

### 6.1 Unit Tests
- Test each error type is thrown correctly
- Test error message generation
- Test recovery strategy selection
- Test logging output formats

### 6.2 Integration Tests
- Test error propagation through layers
- Test recovery workflows end-to-end
- Test telemetry integration
- Test error UI rendering

### 6.3 Chaos Engineering
- Inject random errors during testing
- Test system resilience
- Measure recovery times
- Validate error messages

---

## 7. Configuration

### 7.1 Settings Schema Extension

```json
{
  "errorHandling": {
    "enableAutoRecovery": true,
    "maxRetries": 3,
    "retryBackoffMs": 1000,
    "circuitBreakerThreshold": 5,
    "verboseErrors": false,
    "saveErrorReports": true,
    "errorReportDirectory": "~/.gemini/error-reports"
  },
  "logging": {
    "level": "info",
    "format": "text",
    "outputs": ["console", "file"],
    "logDirectory": "~/.gemini/logs",
    "maxLogSizeMB": 100,
    "maxLogFiles": 10,
    "enableStructuredLogging": false
  }
}
```

---

## 8. Backward Compatibility

All enhancements are **backward compatible**:
- Existing error types remain unchanged
- New features are opt-in via settings
- Default behavior matches current implementation
- No breaking changes to public APIs

---

## 9. Documentation Updates

Required documentation updates:
1. Error handling guide
2. Logging best practices
3. Recovery strategies reference
4. Troubleshooting flowcharts
5. Error code reference

---

## 10. Comparison: Before vs After

| Aspect | Current | Enhanced |
|--------|---------|----------|
| **Error Types** | 30+ types | Same + better context |
| **Error Reports** | JSON file | JSON + breadcrumbs + perf |
| **Logging** | Simple console | Structured + levels |
| **Recovery** | Manual | Automatic strategies |
| **Analytics** | Basic telemetry | Advanced insights |
| **User Messages** | Technical | Contextual + helpful |
| **History** | None | Full tracking |
| **Testing** | 498 tests | + chaos engineering |

---

## 11. Conclusion

The Gemini CLI **already has excellent error handling** infrastructure:
- Comprehensive error types
- Fatal/recoverable distinction
- Context preservation
- Enterprise telemetry
- Type safety

The proposed enhancements focus on:
1. **Better developer experience**: Contextual messages, breadcrumbs
2. **Improved resilience**: Automatic recovery, circuit breakers
3. **Enhanced observability**: Structured logging, analytics
4. **Smarter debugging**: Pattern detection, history tracking

These enhancements will make Gemini CLI even more **robust, debuggable, and user-friendly** while maintaining backward compatibility.

---

## 12. Next Steps

1. ✅ Review and approve this enhancement proposal
2. ⭕ Create detailed implementation plan
3. ⭕ Implement Phase 1 features
4. ⭕ Write comprehensive tests
5. ⭕ Update documentation
6. ⭕ Roll out to preview channel
7. ⭕ Gather feedback and iterate
8. ⭕ Promote to stable

---

*Prepared for Issue #134 - Add error handling and logging to Gemini CLI*
