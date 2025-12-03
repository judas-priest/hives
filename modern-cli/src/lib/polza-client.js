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
    const { model = 'anthropic/claude-sonnet-4.5', tools, stream = false, images } = options;

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
