/**
 * Polza AI Client - Handles API communication
 * Adapted from polza-cli's client implementation
 */

/**
 * Polza AI Client
 */
export class PolzaClient {
  constructor(apiKey, apiBase = 'https://api.polza.ai/api/v1') {
    this.apiKey = apiKey;
    this.apiBase = apiBase;
    this.conversationHistory = [];
  }

  /**
   * Send a chat message with tool support
   */
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

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polza API error: ${response.status} - ${errorText}`);
    }

    if (stream) {
      return this.handleStreamResponse(response);
    }

    const data = await response.json();

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    this.conversationHistory.push({
      role: 'assistant',
      content: data.choices[0].message.content,
    });

    return data;
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
        try {
          const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
          const result = await toolHandlers[name](parsedArgs);
          results.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify(result),
          });
        } catch (error) {
          results.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name,
            content: JSON.stringify({ error: error.message }),
          });
        }
      }
    }

    return results;
  }

  /**
   * Chat with tool execution loop
   */
  async chatWithTools(message, options = {}) {
    const { model, tools = [], toolHandlers = {}, maxIterations = 5 } = options;

    let iterations = 0;
    let currentMessage = message;

    while (iterations < maxIterations) {
      const response = await this.chat(currentMessage, { model, tools });
      const assistantMessage = response.choices[0].message;

      // Check if there are tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Execute tool calls
        const toolResults = await this.handleToolCalls(
          assistantMessage.tool_calls,
          toolHandlers
        );

        // Add assistant message and tool results to history
        this.conversationHistory.push(assistantMessage);
        this.conversationHistory.push(...toolResults);

        // Continue the loop with tool results
        currentMessage = null; // No new user message
        iterations++;
      } else {
        // No more tool calls, return the final response
        return response;
      }
    }

    throw new Error('Max tool call iterations reached');
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
