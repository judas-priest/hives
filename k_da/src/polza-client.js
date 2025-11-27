/**
 * Polza AI Client Integration for K_DA
 *
 * Provides OpenAI-compatible interface to Polza AI API aggregator.
 * Supports multiple LLM providers (OpenAI, Anthropic, Google, etc.) through a single API.
 *
 * @see https://docs.polza.ai
 * @see https://api.polza.ai/api/v1
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
      throw new Error('Polza AI API key not provided. Set POLZA_API_KEY environment variable or pass apiKey in config.');
    }
  }

  /**
   * Send a chat completion request to Polza AI
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The completion response
   */
  async createChatCompletion(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      stream: options.stream ?? false,
      ...(options.topP && { top_p: options.topP }),
      ...(options.topK && { top_k: options.topK }),
      ...(options.frequencyPenalty && { frequency_penalty: options.frequencyPenalty }),
      ...(options.presencePenalty && { presence_penalty: options.presencePenalty }),
      ...(options.stop && { stop: options.stop }),
      ...(options.seed && { seed: options.seed }),
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
      ...(this.enableReasoning && {
        reasoning: {
          effort: options.reasoningEffort || this.reasoningEffort,
          max_tokens: options.reasoningMaxTokens || 2000,
          ...(options.excludeReasoning && { exclude: options.excludeReasoning })
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
      const errorMessage = error.error?.message || response.statusText;

      // Provide helpful error messages
      switch (response.status) {
        case 401:
          throw new Error(`Polza AI: Unauthorized (401) - Check your API key`);
        case 402:
          throw new Error(`Polza AI: Payment Required (402) - Insufficient balance. Please add funds at https://polza.ai`);
        case 429:
          throw new Error(`Polza AI: Rate Limit (429) - Too many requests. Please slow down.`);
        case 400:
          throw new Error(`Polza AI: Bad Request (400) - ${errorMessage}`);
        default:
          throw new Error(`Polza AI API Error (${response.status}): ${errorMessage}`);
      }
    }

    if (options.stream) {
      return this._handleStreamResponse(response);
    }

    return response.json();
  }

  /**
   * Handle streaming response from Polza AI using Server-Sent Events (SSE)
   * @param {Response} response - The fetch response object
   * @returns {AsyncGenerator} - Async generator yielding parsed chunks
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
              console.warn('Polza AI: Failed to parse SSE chunk:', err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * List all available models from Polza AI
   * @returns {Promise<Object>} - Object containing array of model objects
   */
  async listModels() {
    const url = `${this.baseUrl}/models`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Polza AI: Failed to fetch models (${response.status})`);
    }

    return response.json();
  }

  /**
   * Get detailed information about a specific model
   * @param {string} modelId - The model ID (e.g., 'anthropic/claude-sonnet-4.5')
   * @returns {Promise<Object>} - Model details object
   */
  async getModel(modelId) {
    const url = `${this.baseUrl}/models/${encodeURIComponent(modelId)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Polza AI: Failed to fetch model info for ${modelId} (${response.status})`);
    }

    return response.json();
  }

  /**
   * Create a simple text completion (non-streaming)
   * @param {string} prompt - The text prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The completion text
   */
  async complete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: false
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Stream a text completion
   * @param {string} prompt - The text prompt
   * @param {Object} options - Additional options
   * @returns {AsyncGenerator<string>} - Async generator yielding text chunks
   */
  async *streamComplete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const streamResponse = await this._makeStreamRequest(messages, options);

    for await (const chunk of this._handleStreamResponse(streamResponse)) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }

      // Also yield reasoning if present
      const reasoning = chunk.choices?.[0]?.delta?.reasoning;
      if (reasoning && options.yieldReasoning) {
        yield { type: 'reasoning', content: reasoning };
      }

      // Yield usage statistics when available
      if (chunk.usage && options.yieldUsage) {
        yield { type: 'usage', data: chunk.usage };
      }
    }
  }

  /**
   * Make a streaming request to Polza AI
   * @private
   */
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
        temperature: options.temperature ?? this.temperature,
        max_tokens: options.maxTokens ?? this.maxTokens,
        ...options
      })
    });
  }

  /**
   * Create a chat completion with vision support (images)
   * @param {string} text - The text prompt
   * @param {Array<string>} imageUrls - Array of image URLs
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The completion text
   */
  async completeWithVision(text, imageUrls, options = {}) {
    const content = [
      { type: 'text', text: text }
    ];

    // Add images
    for (const url of imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url: url,
          detail: options.imageDetail || 'high'
        }
      });
    }

    const messages = [
      { role: 'user', content: content }
    ];

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: false,
      model: options.model || 'openai/gpt-4o' // Default to vision-capable model
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Create a completion with function/tool calling
   * @param {string} prompt - The text prompt
   * @param {Array} tools - Array of tool definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The completion response with potential tool calls
   */
  async completeWithTools(prompt, tools, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: false,
      tools: tools,
      tool_choice: options.toolChoice || 'auto'
    });

    return response;
  }

  /**
   * Get client configuration information
   * @returns {Object} - Configuration summary
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      enableStreaming: this.enableStreaming,
      enableReasoning: this.enableReasoning,
      reasoningEffort: this.reasoningEffort,
      hasApiKey: !!this.apiKey
    };
  }
}

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PolzaAIClient };
}

if (typeof exports !== 'undefined') {
  exports.PolzaAIClient = PolzaAIClient;
}

// Export as global if no module system
if (typeof window !== 'undefined') {
  window.PolzaAIClient = PolzaAIClient;
}
