/**
 * Polza AI Client - Handles API communication
 * Adapted from polza-cli's client implementation
 */

import { NetworkError, AuthenticationError, ToolExecutionError, RateLimitError, wrapError } from '../utils/errors.js';
import { getLogger } from '../utils/logger.js';
import { getRecoveryManager } from '../utils/error-recovery.js';

/**
 * Polza AI Client
 */
export class PolzaClient {
  constructor(apiKey, apiBase = 'https://api.polza.ai/api/v1') {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
    this.conversationHistory = [];
    this.logger = getLogger();
    this.recoveryManager = getRecoveryManager();

    this.logger.debug('PolzaClient initialized', { apiBase });
  }

  /**
   * Send a chat message with tool support
   */
  async chat(message, options = {}) {
    const { model = 'anthropic/claude-sonnet-4.5', tools, stream = false, images } = options;
    const startTime = Date.now();

    this.logger.api('chat/completions', 0, 0, { model, stream, toolsCount: tools?.length || 0 });

    try {
      // Build message content - support both text and multimodal
      let userMessage;
      if (images && images.length > 0) {
        // Multimodal message with images
        userMessage = {
          role: 'user',
          content: [
            { type: 'text', text: message },
            ...images.map(img => ({
              type: 'image_url',
              image_url: { url: img },
            })),
          ],
        };
        this.logger.debug('Chat with images', { imageCount: images.length });
      } else {
        // Text-only message
        userMessage = { role: 'user', content: message };
      }

      const requestBody = {
        model,
        messages: [...this.conversationHistory, userMessage],
        stream,
      };

      // Only include tools if provided and not empty
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      };

      // Add Accept header for streaming
      if (stream) {
        headers['Accept'] = 'text/event-stream';
      }

      const response = await this.recoveryManager.executeWithRecovery(async () => {
        return await fetch(`${this.apiBase}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        const duration = Date.now() - startTime;

        this.logger.api('chat/completions', duration, response.status, { error: errorText });

        // Throw appropriate error based on status code
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError('Authentication failed with Polza API', 'polza', {
            statusCode: response.status,
            error: errorText,
          });
        } else if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          throw new RateLimitError('Rate limit exceeded', retryAfterMs, {
            statusCode: response.status,
            error: errorText,
          });
        } else {
          throw new NetworkError(
            `Polza API error: ${errorText}`,
            response.status,
            `${this.apiBase}/chat/completions`,
            { error: errorText }
          );
        }
      }

      if (stream) {
        return this.handleStreamResponse(response);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      this.logger.api('chat/completions', duration, 200, {
        model,
        tokensUsed: data.usage?.total_tokens,
      });

      // Add to conversation history
      this.conversationHistory.push({ role: 'user', content: message });
      this.conversationHistory.push({
        role: 'assistant',
        content: data.choices[0].message.content,
      });

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Chat request failed', error, { model, duration });
      throw wrapError(error, { url: `${this.apiBase}/chat/completions`, model });
    }
  }

  /**
   * Handle streaming response
   */
  async *handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            yield parsed;
          } catch (error) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Handle tool calls from AI
   */
  async handleToolCalls(toolCalls, toolHandlers) {
    const results = [];

    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;

      if (toolHandlers[name]) {
        const startTime = Date.now();
        try {
          this.logger.tool(name, 'started', { args });

          const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
          const result = await toolHandlers[name](parsedArgs);

          const duration = Date.now() - startTime;
          this.logger.tool(name, 'completed', { duration, success: result.success });

          results.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const duration = Date.now() - startTime;
          this.logger.error(`Tool ${name} failed`, error, { duration, args });

          const wrappedError = new ToolExecutionError(
            error.message,
            name,
            args,
            { originalError: error.name }
          );

          results.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify({
              error: error.message,
              code: error.code,
              details: wrappedError.details,
            }),
          });
        }
      } else {
        this.logger.warn(`Tool handler not found: ${name}`);
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name,
          content: JSON.stringify({ error: `Tool handler '${name}' not found` }),
        });
      }
    }

    return results;
  }

  /**
   * Chat with tool execution loop
   */
  async chatWithTools(message, options = {}) {
    const { model, tools = [], toolHandlers = {}, maxIterations = 5, images } = options;

    // Start with the initial user message
    const response = await this.chat(message, { model, tools, images });
    let assistantMessage = response.choices[0].message;

    let iterations = 0;

    // Tool execution loop - continue while there are tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < maxIterations) {
      // Execute tool calls
      const toolResults = await this.handleToolCalls(
        assistantMessage.tool_calls,
        toolHandlers
      );

      // Add assistant message and tool results to history
      this.conversationHistory.push(assistantMessage);
      this.conversationHistory.push(...toolResults);

      // Continue with tool results (no new user message needed)
      // Build request with conversation history
      const requestBody = {
        model,
        messages: this.conversationHistory,
        stream: false,
      };

      // Only include tools if provided and not empty
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      const nextResponse = await fetch(`${this.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!nextResponse.ok) {
        const errorText = await nextResponse.text();
        throw new Error(`Polza API error: ${nextResponse.status} - ${errorText}`);
      }

      const nextData = await nextResponse.json();
      assistantMessage = nextData.choices[0].message;

      iterations++;
    }

    if (iterations >= maxIterations && assistantMessage.tool_calls?.length > 0) {
      throw new Error('Max tool call iterations reached');
    }

    // Return final response with last assistant message
    return {
      ...response,
      choices: [{
        ...response.choices[0],
        message: assistantMessage,
      }],
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }
}
