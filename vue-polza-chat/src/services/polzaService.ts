import type {
  PolzaChatRequest,
  PolzaChatResponse,
  PolzaStreamChunk,
  Tool,
} from '../types'

export class PolzaService {
  private apiKey: string
  private baseURL: string
  private defaultModel: string

  constructor(
    apiKey: string,
    baseURL = 'https://api.polza.ai/api/v1',
    defaultModel = 'anthropic/claude-sonnet-4.5'
  ) {
    this.apiKey = apiKey
    this.baseURL = baseURL
    this.defaultModel = defaultModel
  }

  /**
   * Send a chat completion request to Polza API
   */
  async chat(
    request: Omit<PolzaChatRequest, 'model'> & { model?: string }
  ): Promise<PolzaChatResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.defaultModel,
        ...request,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Polza API error: ${error.error || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Send a streaming chat completion request
   */
  async *chatStream(
    request: Omit<PolzaChatRequest, 'model' | 'stream'> & { model?: string }
  ): AsyncGenerator<PolzaStreamChunk> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.defaultModel,
        stream: true,
        ...request,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`Polza API error: ${error.error || response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6))
              yield data
            } catch (e) {
              console.warn('Failed to parse SSE data:', trimmedLine)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Get available tools definition for Polza API
   */
  static getToolsDefinition(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'bash',
          description: 'Execute bash commands in the shell',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The bash command to execute',
              },
              description: {
                type: 'string',
                description: 'Description of what the command does',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
              },
            },
            required: ['command'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read',
          description: 'Read file contents',
          parameters: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to read',
              },
              offset: {
                type: 'number',
                description: 'Line number to start reading from',
              },
              limit: {
                type: 'number',
                description: 'Number of lines to read',
              },
            },
            required: ['file_path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'write',
          description: 'Write content to a file',
          parameters: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to write',
              },
              content: {
                type: 'string',
                description: 'Content to write to the file',
              },
            },
            required: ['file_path', 'content'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'edit',
          description: 'Edit file by replacing exact string matches',
          parameters: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the file to edit',
              },
              old_string: {
                type: 'string',
                description: 'The exact string to replace',
              },
              new_string: {
                type: 'string',
                description: 'The new string to replace with',
              },
              replace_all: {
                type: 'boolean',
                description: 'Replace all occurrences (default: false)',
              },
            },
            required: ['file_path', 'old_string', 'new_string'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list',
          description: 'List files and directories',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to list contents of',
              },
              recursive: {
                type: 'boolean',
                description: 'List recursively',
              },
            },
            required: ['path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'glob',
          description: 'Find files using glob patterns',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Glob pattern to match files (e.g., "**/*.ts")',
              },
              path: {
                type: 'string',
                description: 'Directory to search in',
              },
            },
            required: ['pattern'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'grep',
          description: 'Search for patterns in files using regex',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Regular expression pattern to search for',
              },
              path: {
                type: 'string',
                description: 'Path to search in',
              },
              output_mode: {
                type: 'string',
                enum: ['content', 'files_with_matches', 'count'],
                description: 'Output mode',
              },
              '-i': {
                type: 'boolean',
                description: 'Case insensitive search',
              },
              type: {
                type: 'string',
                description: 'File type to search (e.g., "js", "py")',
              },
            },
            required: ['pattern'],
          },
        },
      },
    ]
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.defaultModel = model
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.defaultModel
  }
}
