/**
 * Polza AI Client
 * A simple client for interacting with Polza AI API
 */

import https from 'https';

export class PolzaClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.POLZA_API_KEY;
    let baseUrl = config.baseUrl || process.env.POLZA_API_BASE || 'https://api.polza.ai/api/v1';
    // Ensure baseUrl ends with a slash for proper URL construction
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    this.model = config.model || process.env.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5';
    this.temperature = config.temperature || parseFloat(process.env.POLZA_TEMPERATURE || '0.7');
    this.maxTokens = config.maxTokens || parseInt(process.env.POLZA_MAX_TOKENS || '4096', 10);

    if (!this.apiKey) {
      throw new Error('Polza API key is required. Set POLZA_API_KEY environment variable or provide it in config.');
    }
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(messages, options = {}) {
    const url = new URL('chat/completions', this.baseUrl);

    const requestBody = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      max_tokens: options.maxTokens !== undefined ? options.maxTokens : this.maxTokens,
      stream: options.stream || false,
      tools: options.tools || undefined,
      tool_choice: options.tool_choice || undefined
    };

    return this._makeRequest(url, 'POST', requestBody);
  }

  /**
   * Simple completion helper
   */
  async complete(prompt, options = {}) {
    const messages = [{ role: 'user', content: prompt }];
    const response = await this.createChatCompletion(messages, options);
    return response.choices[0].message.content;
  }

  /**
   * Chat with message history
   */
  async chat(messages, options = {}) {
    return this.createChatCompletion(messages, options);
  }

  /**
   * List available models
   */
  async listModels() {
    const url = new URL('models', this.baseUrl);
    return this._makeRequest(url, 'GET');
  }

  /**
   * Make HTTP request
   */
  _makeRequest(url, method, body = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || data}`));
            }
          } catch (error) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}
