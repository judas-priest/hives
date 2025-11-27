# Polza AI Integration Guide for K_DA

## Overview

This document provides a comprehensive guide for integrating Polza AI as a third-party model provider in the K_DA (Koda Agent CLI) application. Polza AI is an API aggregator that provides unified access to multiple LLM providers (OpenAI, Anthropic, DeepSeek, etc.) through a single OpenAI-compatible interface.

## What is Polza AI?

Polza AI (`https://api.polza.ai`) is a Russian-language AI service aggregator that:
- Provides access to OpenAI, Anthropic, Google, and other LLM providers
- Uses OpenAI-compatible API format
- Offers billing in Russian Rubles (₽)
- Supports all major features: streaming, function calling, vision, reasoning tokens
- Provides cost-effective access to premium models

### Supported Models (Examples)

| Provider | Model ID | Description |
|----------|----------|-------------|
| Anthropic | `anthropic/claude-sonnet-4.5` | Latest Claude Sonnet |
| Anthropic | `anthropic/claude-3-5-sonnet` | Claude 3.5 Sonnet |
| OpenAI | `openai/gpt-4o` | GPT-4 Optimized |
| OpenAI | `openai/o1-preview` | O1 with reasoning |
| DeepSeek | `deepseek/deepseek-r1` | DeepSeek R1 |

Full model list available at: `https://api.polza.ai/api/v1/models`

## Integration Architecture

### Current K_DA Architecture

K_DA currently uses:
1. **Koda API** - Primary service (`KODA_API_KEY`)
2. **Gemini Client** - Google's Gemini models
3. **Vertex AI** - Google Cloud AI Platform

### Proposed Polza AI Integration

Add Polza AI as an **alternative provider** that can:
- Replace or supplement existing providers
- Use the same configuration system
- Support all K_DA features (streaming, tools, etc.)

## Implementation Steps

### Step 1: Add Environment Variables

Add to `.env.example`:

```bash
# ==============================================================================
# Polza AI Configuration
# ==============================================================================

# POLZA_API_KEY - API key for Polza AI service authentication
# Get your key from: https://polza.ai
# POLZA_API_KEY=ak_your_api_key_here

# POLZA_API_BASE - Base URL for Polza AI API
# POLZA_API_BASE=https://api.polza.ai/api/v1

# POLZA_DEFAULT_MODEL - Default model to use with Polza AI
# Format: provider/model-name (e.g., anthropic/claude-sonnet-4.5)
# POLZA_DEFAULT_MODEL=anthropic/claude-sonnet-4.5

# POLZA_ENABLE_STREAMING - Enable streaming responses
# POLZA_ENABLE_STREAMING=true

# POLZA_MAX_TOKENS - Maximum tokens for completions
# POLZA_MAX_TOKENS=4096

# POLZA_TEMPERATURE - Temperature for generation (0.0-2.0)
# POLZA_TEMPERATURE=0.7

# POLZA_ENABLE_REASONING - Enable reasoning tokens for supported models
# POLZA_ENABLE_REASONING=false

# POLZA_REASONING_EFFORT - Reasoning effort level (low, medium, high)
# POLZA_REASONING_EFFORT=high
```

### Step 2: Create Polza AI Client Module

Create `k_da/src/polza-client.js`:

```javascript
/**
 * Polza AI Client Integration
 * Provides OpenAI-compatible interface to Polza AI API
 */

class PolzaAIClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.POLZA_API_KEY;
    this.baseUrl = config.baseUrl || process.env.POLZA_API_BASE || 'https://api.polza.ai/api/v1';
    this.defaultModel = config.model || process.env.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5';
    this.temperature = parseFloat(config.temperature || process.env.POLZA_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(config.maxTokens || process.env.POLZA_MAX_TOKENS || '4096');
    this.enableStreaming = config.enableStreaming !== false;
    this.enableReasoning = config.enableReasoning === true;
    this.reasoningEffort = config.reasoningEffort || process.env.POLZA_REASONING_EFFORT || 'high';

    if (!this.apiKey) {
      throw new Error('Polza AI API key not provided. Set POLZA_API_KEY environment variable.');
    }
  }

  /**
   * Send a chat completion request to Polza AI
   */
  async createChatCompletion(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      stream: options.stream ?? false,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
      ...(this.enableReasoning && {
        reasoning: {
          effort: options.reasoningEffort || this.reasoningEffort,
          max_tokens: options.reasoningMaxTokens || 2000
        }
      })
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.stream && { 'Accept': 'text/event-stream' })
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Polza AI API Error (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    if (options.stream) {
      return this._handleStreamResponse(response);
    }

    return response.json();
  }

  /**
   * Handle streaming response from Polza AI
   */
  async *_handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (err) {
              console.warn('Failed to parse SSE chunk:', err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List available models from Polza AI
   */
  async listModels() {
    const url = `${this.baseUrl}/models`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get model information
   */
  async getModel(modelId) {
    const url = `${this.baseUrl}/models/${modelId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch model info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a simple text completion
   */
  async complete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: false
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Stream a text completion
   */
  async *streamComplete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    for await (const chunk of this._handleStreamResponse(
      await this._makeStreamRequest(messages, options)
    )) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  async _makeStreamRequest(messages, options) {
    const url = `${this.baseUrl}/chat/completions`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages: messages,
        stream: true,
        ...options
      })
    });
  }
}

// Export for use in K_DA
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PolzaAIClient };
}
```

### Step 3: Add CLI Configuration Options

Add these CLI flags to the argument parser:

```javascript
.option('polza', {
  type: 'boolean',
  description: 'Use Polza AI as the model provider',
  default: false
})
.option('polza-model', {
  type: 'string',
  description: 'Polza AI model to use (e.g., anthropic/claude-sonnet-4.5)',
})
.option('polza-api-key', {
  type: 'string',
  description: 'Polza AI API key (overrides POLZA_API_KEY env var)',
})
.option('polza-streaming', {
  type: 'boolean',
  description: 'Enable streaming for Polza AI responses',
  default: true
})
.option('polza-reasoning', {
  type: 'boolean',
  description: 'Enable reasoning tokens for compatible models',
  default: false
})
```

### Step 4: Usage Examples

#### Example 1: Basic Usage

```bash
# Export your Polza AI key
export POLZA_API_KEY="ak_your_api_key_here"

# Use Polza AI with Claude Sonnet 4.5
./k_da.js --polza --polza-model="anthropic/claude-sonnet-4.5"

# Use Polza AI with GPT-4
./k_da.js --polza --polza-model="openai/gpt-4o"
```

#### Example 2: With Reasoning

```bash
# Use DeepSeek R1 with reasoning enabled
./k_da.js --polza \
  --polza-model="deepseek/deepseek-r1" \
  --polza-reasoning=true
```

#### Example 3: Programmatic Usage

```javascript
const { PolzaAIClient } = require('./k_da/src/polza-client.js');

// Initialize client
const client = new PolzaAIClient({
  apiKey: 'ak_your_api_key_here',
  model: 'anthropic/claude-sonnet-4.5',
  temperature: 0.7
});

// Simple completion
const response = await client.complete('Explain quantum computing in simple terms');
console.log(response);

// Streaming completion
for await (const chunk of client.streamComplete('Write a story about AI')) {
  process.stdout.write(chunk);
}

// Chat with history
const chatResponse = await client.createChatCompletion([
  { role: 'system', content: 'You are a helpful coding assistant.' },
  { role: 'user', content: 'How do I reverse a string in Python?' }
]);
console.log(chatResponse.choices[0].message.content);
```

## Feature Compatibility Matrix

| Feature | K_DA Current | Polza AI Support | Notes |
|---------|--------------|------------------|-------|
| Text Completion | ✅ | ✅ | Full support |
| Streaming | ✅ | ✅ | Server-Sent Events |
| Function Calling | ✅ | ✅ | OpenAI-compatible tools |
| Multi-modal (Vision) | ✅ | ✅ | Image + text input |
| Reasoning Tokens | ❓ | ✅ | O1, DeepSeek-R1 models |
| Prompt Caching | ✅ | ✅ | Anthropic-style caching |
| Cost Tracking | ✅ | ✅ | Rubles, included in response |
| Multiple Providers | Partial | ✅ | Access to 10+ providers |

## Benefits of Polza AI Integration

### 1. **Cost Efficiency**
- Billing in Russian Rubles (often cheaper)
- Competitive pricing across providers
- Detailed cost tracking in API responses

### 2. **Provider Diversity**
- Access to multiple AI providers through one API
- Easy switching between models
- Fallback options if one provider is down

### 3. **Advanced Features**
- Reasoning tokens (O1, DeepSeek-R1)
- Prompt caching for cost savings
- Multimodal support across providers

### 4. **OpenAI Compatibility**
- Drop-in replacement for OpenAI SDK
- Easy migration for existing OpenAI code
- Standard API format

## Security Considerations

### API Key Storage

```bash
# Method 1: Environment variable (recommended)
export POLZA_API_KEY="ak_xxxxxxxxxxxx"

# Method 2: Configuration file (ensure proper permissions)
# In ~/.koda/config.json:
{
  "polza": {
    "apiKey": "ak_xxxxxxxxxxxx",
    "defaultModel": "anthropic/claude-sonnet-4.5"
  }
}

# Method 3: CLI argument (least secure, visible in process list)
./k_da.js --polza-api-key="ak_xxxxxxxxxxxx"
```

### Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** in production
3. **Rotate keys regularly** for security
4. **Monitor usage** through Polza dashboard
5. **Set rate limits** to prevent abuse

## Error Handling

### Common Errors and Solutions

| Error Code | Description | Solution |
|------------|-------------|----------|
| 401 | Unauthorized | Check API key validity |
| 402 | Payment Required | Add funds to Polza account |
| 429 | Rate Limit | Reduce request frequency |
| 400 | Bad Request | Validate request parameters |
| 500 | Server Error | Retry with exponential backoff |

### Example Error Handler

```javascript
async function robustPolzaRequest(client, messages, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.createChatCompletion(messages);
    } catch (error) {
      if (error.message.includes('402')) {
        throw new Error('Insufficient funds in Polza account. Please add balance.');
      }

      if (error.message.includes('429')) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}
```

## Testing

### Test Script

Create `k_da/experiments/test-polza-integration.mjs`:

```javascript
import { PolzaAIClient } from '../src/polza-client.js';

async function testPolzaIntegration() {
  console.log('🧪 Testing Polza AI Integration\n');

  // Check API key
  if (!process.env.POLZA_API_KEY) {
    console.error('❌ POLZA_API_KEY not set');
    process.exit(1);
  }

  const client = new PolzaAIClient({
    model: 'anthropic/claude-sonnet-4.5'
  });

  console.log('✅ Client initialized');

  // Test 1: List models
  console.log('\n📋 Listing available models...');
  try {
    const models = await client.listModels();
    console.log(`✅ Found ${models.data?.length || 0} models`);
  } catch (error) {
    console.error('❌ Failed to list models:', error.message);
  }

  // Test 2: Simple completion
  console.log('\n💬 Testing simple completion...');
  try {
    const response = await client.complete('Say "Hello from Polza AI!"');
    console.log('✅ Response:', response);
  } catch (error) {
    console.error('❌ Completion failed:', error.message);
  }

  // Test 3: Streaming
  console.log('\n🌊 Testing streaming...');
  try {
    process.stdout.write('✅ Stream output: ');
    for await (const chunk of client.streamComplete('Count from 1 to 5')) {
      process.stdout.write(chunk);
    }
    console.log('\n');
  } catch (error) {
    console.error('❌ Streaming failed:', error.message);
  }

  console.log('✅ All tests completed!');
}

testPolzaIntegration().catch(console.error);
```

Run tests:
```bash
chmod +x k_da/experiments/test-polza-integration.mjs
node k_da/experiments/test-polza-integration.mjs
```

## Migration Guide

### From Koda API to Polza AI

```javascript
// Before (Koda API)
const kodaClient = new KodaClient({
  apiKey: process.env.KODA_API_KEY
});

// After (Polza AI)
const polzaClient = new PolzaAIClient({
  apiKey: process.env.POLZA_API_KEY,
  model: 'anthropic/claude-sonnet-4.5'  // Choose your preferred model
});
```

### From Gemini to Polza AI

```javascript
// Before (Gemini)
const geminiClient = config.getGeminiClient();
const response = await geminiClient.generateContent(prompt);

// After (Polza AI with Google models)
const polzaClient = new PolzaAIClient({
  model: 'google/gemini-pro'  // Use Google models through Polza
});
const response = await polzaClient.complete(prompt);
```

## Roadmap

### Phase 1: Basic Integration ✅
- [x] Environment variable support
- [x] Basic completion API
- [x] Streaming support
- [x] Error handling

### Phase 2: Advanced Features
- [ ] Function/tool calling integration
- [ ] Vision/multimodal support
- [ ] Reasoning tokens for O1/R1 models
- [ ] Prompt caching

### Phase 3: UI/UX
- [ ] Model selector in CLI
- [ ] Cost tracking display
- [ ] Provider status indicators
- [ ] Configuration wizard

### Phase 4: Enterprise
- [ ] Rate limiting
- [ ] Usage analytics
- [ ] Multi-account support
- [ ] Custom model endpoints

## Resources

### Documentation
- **Polza AI Docs**: https://docs.polza.ai
- **API Reference**: https://docs.polza.ai/api-reference
- **Model Pricing**: https://polza.ai/pricing
- **SDK Examples**: See `polza.txt` in repository

### Support
- **Polza Support**: support@polza.ai
- **K_DA Issues**: https://github.com/yourusername/hives/issues

### Example Code
- `agent_polza2/`: Complete Polza integration examples
- `experiments/test-polza-*.mjs`: Integration test scripts
- `polza.txt`: API documentation and examples

## Contributing

To contribute Polza AI integration improvements:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/polza-enhancement`
3. Make changes and test thoroughly
4. Submit pull request with clear description

## License

This integration guide is part of the K_DA project and follows the same license terms.

---

**Last Updated**: November 27, 2025
**Author**: AI Issue Solver
**Version**: 1.0.0
