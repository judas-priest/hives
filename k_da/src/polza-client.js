/**
 * Polza AI Client Integration
 * Provides OpenAI-compatible interface to Polza AI API
 *
 * This client can be used standalone or integrated into K_DA builds.
 *
 * Usage:
 *   const { PolzaAIClient } = require('./src/polza-client.js');
 *   const client = new PolzaAIClient({ apiKey: 'ak_xxx' });
 *   const response = await client.complete('Hello!');
 *
 * @module polza-client
 */

class PolzaAIClient {
  /**
   * Create a Polza AI client
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - Polza AI API key (or uses POLZA_API_KEY env var)
   * @param {string} config.baseUrl - Base API URL (default: https://api.polza.ai/api/v1)
   * @param {string} config.model - Default model to use (default: anthropic/claude-sonnet-4.5)
   * @param {number} config.temperature - Temperature for generation (default: 0.7)
   * @param {number} config.maxTokens - Maximum tokens for completions (default: 4096)
   * @param {boolean} config.enableStreaming - Enable streaming responses (default: true)
   * @param {boolean} config.enableReasoning - Enable reasoning tokens for o1/r1 models (default: false)
   * @param {string} config.reasoningEffort - Reasoning effort level: low/medium/high (default: high)
   */
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
   * Get current client configuration
   * @returns {Object} Client configuration
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      enableStreaming: this.enableStreaming,
      enableReasoning: this.enableReasoning,
      reasoningEffort: this.reasoningEffort
    };
  }

  /**
   * Send a chat completion request to Polza AI
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Request options
   * @param {string} options.model - Model to use (overrides default)
   * @param {number} options.temperature - Temperature (overrides default)
   * @param {number} options.maxTokens - Max tokens (overrides default)
   * @param {boolean} options.stream - Enable streaming
   * @param {Array} options.tools - Function calling tools
   * @param {Object} options.toolChoice - Tool choice strategy
   * @returns {Promise<Object>} Completion response
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

    try {
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
    } catch (error) {
      console.error('Polza AI Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle streaming response from Polza AI
   * @private
   * @param {Response} response - Fetch response object
   * @returns {AsyncGenerator} Async generator yielding chunks
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
   * @returns {Promise<Object>} Models list response
   */
  async listModels() {
    const url = `${this.baseUrl}/models`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Polza AI Models request failed:', error.message);
      throw error;
    }
  }

  /**
   * Get information about a specific model
   * @param {string} modelId - Model identifier (e.g., 'anthropic/claude-sonnet-4.5')
   * @returns {Promise<Object>} Model information
   */
  async getModel(modelId) {
    const url = `${this.baseUrl}/models/${modelId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch model info: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Polza AI Model info request failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a simple text completion (convenience method)
   * @param {string} prompt - Text prompt
   * @param {Object} options - Request options (same as createChatCompletion)
   * @returns {Promise<string>} Completion text
   */
  async complete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: false
    });

    return response.choices?.[0]?.message?.content || '';
  }

  /**
   * Stream a text completion (convenience method)
   * @param {string} prompt - Text prompt
   * @param {Object} options - Request options
   * @returns {AsyncGenerator<string>} Async generator yielding text chunks
   */
  async *streamComplete(prompt, options = {}) {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      stream: true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Polza AI API Error (${response.status}): ${error.error?.message || response.statusText}`
      );
    }

    for await (const chunk of this._handleStreamResponse(response)) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}

// Polza AI integration helper singleton
const polzaAI = {
  client: null,

  /**
   * Initialize the Polza AI client
   * @param {Object} config - Configuration options (see PolzaAIClient constructor)
   * @returns {PolzaAIClient} Initialized client instance
   */
  init(config = {}) {
    if (!this.client) {
      try {
        this.client = new PolzaAIClient(config);
        console.log('✅ Polza AI client initialized');
      } catch (error) {
        console.warn('⚠️  Polza AI initialization failed:', error.message);
      }
    }
    return this.client;
  },

  /**
   * Check if Polza AI client is available
   * @returns {boolean} True if client is initialized
   */
  isAvailable() {
    return !!this.client;
  },

  /**
   * Simple completion using initialized client
   * @param {string} prompt - Text prompt
   * @param {Object} options - Request options
   * @returns {Promise<string>} Completion text
   */
  async complete(prompt, options = {}) {
    if (!this.client) {
      throw new Error('Polza AI client not initialized. Call polzaAI.init() first.');
    }
    return this.client.complete(prompt, options);
  },

  /**
   * Chat completion using initialized client
   * @param {Array} messages - Message array
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Completion response
   */
  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Polza AI client not initialized. Call polzaAI.init() first.');
    }
    return this.client.createChatCompletion(messages, options);
  }
};

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PolzaAIClient, polzaAI };
}

// Export for ES modules
if (typeof exports !== 'undefined') {
  exports.PolzaAIClient = PolzaAIClient;
  exports.polzaAI = polzaAI;
}
