# Analysis of `/limits` Command Implementation in hive-mind

## Overview

This document analyzes how the `/limits` command is implemented in the [hive-mind](https://github.com/link-assistant/hive-mind) Telegram bot. The command displays Claude API usage statistics to authorized users in group chats.

## Architecture

The implementation consists of two main components:

1. **telegram-bot.mjs** - Command handler registration and Telegram interaction
2. **claude-limits.lib.mjs** - API integration and data formatting logic

## Command Handler (telegram-bot.mjs)

### Registration

The command is registered using the Telegraf framework:

```javascript
bot.command('limits', async (ctx) => {
  // Handler implementation
});
```

### Validation Flow

The handler performs multiple validation checks before execution:

1. **Verbose Logging**: Logs command receipt if VERBOSE mode is enabled
2. **Error Tracking**: Adds Sentry breadcrumb with chat and user metadata
3. **Message Age Check**: Ignores messages sent before bot started (`isOldMessage`)
4. **Forwarded/Reply Filter**: Ignores forwarded or reply messages (`isForwardedOrReply`)
5. **Chat Type Validation**: Ensures command is used in group chats only (`isGroupChat`)
6. **Authorization Check**: Validates chat is authorized to use bot (`isChatAuthorized`)

### User Experience Flow

```javascript
// 1. Send "fetching" message to indicate work is in progress
const fetchingMessage = await ctx.reply('🔄 Fetching Claude usage limits...', {
  reply_to_message_id: ctx.message.message_id
});

// 2. Get the usage limits using the library function
const result = await getClaudeUsageLimits(VERBOSE);

// 3. Edit the fetching message with results or error
if (!result.success) {
  await ctx.telegram.editMessageText(
    fetchingMessage.chat.id,
    fetchingMessage.message_id,
    undefined,
    `❌ ${result.error}`
  );
  return;
}

// 4. Format and display the usage data
const message = '📊 *Claude Usage Limits*\n\n' + formatUsageMessage(result.usage);
await ctx.telegram.editMessageText(
  fetchingMessage.chat.id,
  fetchingMessage.message_id,
  undefined,
  message,
  { parse_mode: 'Markdown' }
);
```

## Library Implementation (claude-limits.lib.mjs)

### Core Function: getClaudeUsageLimits

This function retrieves Claude usage data via the Anthropic OAuth API:

```javascript
export async function getClaudeUsageLimits(verbose = false, credentialsPath = DEFAULT_CREDENTIALS_PATH)
```

**Process:**

1. **Read Credentials**
   - Default path: `~/.claude/.credentials.json`
   - Extracts access token from `claudeAiOauth.accessToken`

2. **API Call**
   - Endpoint: `https://api.anthropic.com/api/oauth/usage`
   - Headers:
     ```javascript
     {
       'Accept': 'application/json',
       'Content-Type': 'application/json',
       'User-Agent': 'claude-code/2.0.55',
       'Authorization': `Bearer ${accessToken}`,
       'anthropic-beta': 'oauth-2025-04-20'
     }
     ```

3. **Response Parsing**
   - Extracts three usage metrics:
     - `five_hour`: Current session utilization
     - `seven_day`: All models weekly utilization
     - `seven_day_sonnet`: Sonnet-specific weekly utilization

4. **Return Format**
   ```javascript
   {
     success: true,
     usage: {
       currentSession: {
         percentage: number,
         resetTime: string,  // e.g., "Dec 3, 6:59pm UTC"
         resetsAt: string    // ISO 8601 format
       },
       allModels: { ... },
       sonnetOnly: { ... }
     }
   }
   ```

### Error Handling

The function handles multiple error scenarios:

- **Missing credentials file**: Returns user-friendly error
- **Missing access token**: Prompts user to re-authenticate
- **401 Unauthorized**: Detects expired token
- **Network errors**: Generic error message with details
- **Invalid response**: Handles malformed API responses

### Formatting Functions

#### formatUsageMessage

Generates a Telegram-compatible message with:

```
📊 *Claude Usage Limits*

```
Current time: Dec 6, 10:45am UTC

Current session
███████████████░░░░░░░░░░░░░░░ 50% used
Resets in 2h 15m (Dec 6, 1:00pm UTC)

Current week (all models)
████████████░░░░░░░░░░░░░░░░░░ 40% used
Resets in 1d 13h 15m (Dec 8, 12:00am UTC)

Current week (Sonnet only)
██████████░░░░░░░░░░░░░░░░░░░░ 35% used
Resets in 1d 13h 15m (Dec 8, 12:00am UTC)
```
```

#### getProgressBar

Generates a 30-character visual progress bar:

```javascript
export function getProgressBar(percentage) {
  const totalBlocks = 30;
  const filledBlocks = Math.round((percentage / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return '\u2593'.repeat(filledBlocks) + '\u2591'.repeat(emptyBlocks);
}
```

Uses Unicode block characters:
- `\u2593` (▓) for filled portions
- `\u2591` (░) for empty portions

#### Time Formatting Functions

**formatResetTime**: Converts ISO 8601 to human-readable format
- Input: `"2025-12-03T17:59:59.626485+00:00"`
- Output: `"Dec 3, 6:59pm UTC"`

**formatRelativeTime**: Shows time remaining until reset
- Returns format: `"1h 34m"` or `"6d 20h 13m"`
- Returns `null` for past dates

**formatCurrentTime**: Shows current UTC time
- Format: `"Dec 3, 6:45pm UTC"`

## Key Design Patterns

### 1. Message Editing UX Pattern

Instead of showing a loading state and then posting a new message, the bot:
1. Posts a "fetching" message immediately
2. Edits that message with results when ready

This reduces chat clutter and provides better user experience.

### 2. Verbose Logging Support

Throughout the codebase, verbose logging is conditional:

```javascript
if (VERBOSE) {
  console.log('[VERBOSE] /limits command received');
}
```

This allows for detailed debugging without polluting production logs.

### 3. Graceful Error Handling

Every error scenario returns a user-friendly message:
- Missing credentials
- Expired authentication
- API failures
- Network errors

### 4. Monospace Formatting

The message uses code blocks (triple backticks) to ensure:
- Progress bars align properly
- Consistent spacing across different Telegram clients

### 5. Separation of Concerns

- **telegram-bot.mjs**: Telegram-specific logic, validation, authorization
- **claude-limits.lib.mjs**: Reusable API integration, data formatting

## Dependencies

- **Telegraf**: Telegram bot framework
- **Node.js built-ins**: `fs/promises`, `os`, `path`
- **Anthropic OAuth API**: Usage data endpoint

## Security Considerations

1. **Credentials Protection**: Reads from `~/.claude/.credentials.json`, not exposed in code
2. **Authorization Checks**: Only authorized chats can use the command
3. **Group Chat Only**: Prevents usage in private chats to maintain control
4. **Error Message Safety**: Doesn't expose sensitive details in error messages

## Summary

The `/limits` command demonstrates professional bot development practices:

- Clean separation of concerns
- Robust error handling
- Excellent user experience with message editing
- Comprehensive validation and authorization
- Reusable library functions
- Proper API integration
- User-friendly visual formatting

The implementation is production-ready with verbose logging, error tracking (Sentry), and graceful degradation when services are unavailable.
