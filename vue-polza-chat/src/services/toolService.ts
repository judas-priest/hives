import type {
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolResult,
} from '../types'

/**
 * Tool Service for executing tools via backend API
 *
 * This service communicates with a backend server that securely executes tools.
 * Tools should NEVER be executed directly in the browser for security reasons.
 */
export class ToolService {
  private baseURL: string

  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL
  }

  /**
   * Execute a tool via backend API
   */
  async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        return {
          success: false,
          error: error.error || response.statusText,
        }
      }

      const data = await response.json()
      return {
        success: true,
        result: data.result,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Execute multiple tools in batch
   */
  async executeBatch(
    tools: ToolExecutionRequest[]
  ): Promise<ToolExecutionResponse[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tools/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tools }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || response.statusText)
      }

      const data = await response.json()
      return data.results
    } catch (error) {
      // Return error for all tools
      return tools.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }

  /**
   * Get file system entry info
   */
  async getFileInfo(path: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/files/info?path=${encodeURIComponent(path)}`
      )

      if (!response.ok) {
        throw new Error('Failed to get file info')
      }

      return response.json()
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get file info'
      )
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/files/list?path=${encodeURIComponent(path)}`
      )

      if (!response.ok) {
        throw new Error('Failed to list directory')
      }

      return response.json()
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to list directory'
      )
    }
  }

  /**
   * Read file contents
   */
  async readFile(path: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/files/read?path=${encodeURIComponent(path)}`
      )

      if (!response.ok) {
        throw new Error('Failed to read file')
      }

      const data = await response.json()
      return data.content
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to read file'
      )
    }
  }

  /**
   * Write file contents
   */
  async writeFile(path: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/files/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      })

      if (!response.ok) {
        throw new Error('Failed to write file')
      }
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to write file'
      )
    }
  }

  /**
   * Set backend URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url
  }
}
