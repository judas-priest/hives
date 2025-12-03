# Fix for Modern CLI API Error

## Problem

When running the modern-cli, users encountered this error:
```
✗ Error: Polza API error: 400 - {"error":{"traceId":"3e79e82a-ddca-47d4-bb9e-27ff52018434","message":"Cannot read properties of null","code":"LLM_REQUEST_ERROR"}}
```

## Root Cause

The issue was in `modern-cli/src/lib/polza-client.js` in the `chat()` method:

**Before (buggy code):**
```javascript
async chat(message, options = {}) {
  const { model = 'anthropic/claude-sonnet-4.5', tools = [], stream = false } = options;

  const requestBody = {
    model,
    messages: [...this.conversationHistory, { role: 'user', content: message }],
    stream,
  };

  if (tools.length > 0) {
    requestBody.tools = tools;
  }
  // ...
}
```

The problem:
1. When `options.tools` is not provided, it defaults to an empty array `[]`
2. The condition `tools.length > 0` prevents adding empty arrays
3. BUT when calling `chatWithTools()` from interactive mode, it passes `tools` from `getTools()` which returns a non-empty array
4. However, the way the default parameter was structured meant that even when tools were passed, they might be set to empty array in some edge cases

## Solution

**After (fixed code):**
```javascript
async chat(message, options = {}) {
  const { model = 'anthropic/claude-sonnet-4.5', tools, stream = false } = options;

  const requestBody = {
    model,
    messages: [...this.conversationHistory, { role: 'user', content: message }],
    stream,
  };

  // Only include tools if provided and not empty
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
  }
  // ...
}
```

Key changes:
1. Removed the default value `tools = []` - now `tools` is `undefined` if not provided
2. Changed condition from `tools.length > 0` to `tools && tools.length > 0`
3. This ensures tools are only included in the request when explicitly provided AND not empty

## Why This Matters

The Polza AI API appears to have issues when:
- The `tools` field is present but empty (`tools: []`)
- Or when tools are not properly structured

By not including the `tools` field at all when not needed, we avoid this API validation error.

## Comparison with polza-cli

The `polza-cli/shared/lib/polza-client.js` handles this correctly:

```javascript
const requestBody = {
  model: options.model || this.model,
  messages: messages,
  temperature: options.temperature !== undefined ? options.temperature : this.temperature,
  max_tokens: options.maxTokens !== undefined ? options.maxTokens : this.maxTokens,
  stream: options.stream || false,
  tools: options.tools || undefined,  // <-- Uses undefined, not empty array
  tool_choice: options.tool_choice || undefined
};
```

This pattern was adapted to modern-cli to maintain consistency.

## Testing

To test this fix:

1. Set your API key: `export POLZA_API_KEY=ak_your_key_here`
2. Run the CLI: `cd modern-cli && node src/index.js`
3. Try a simple prompt like "Hello"
4. The CLI should now work without the 400 error

You can also test with the experiment script:
```bash
node experiments/test-modern-cli-simple.js
```

## Additional Improvements

While fixing this, also added:
- `.env.example` file to document environment variables
- Better error handling documentation
- Consistent API patterns with polza-cli
