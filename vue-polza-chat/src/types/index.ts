// Message types based on agent_polza2 event structure
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  parts?: MessagePart[]
  toolCalls?: ToolCall[]
}

export interface MessagePart {
  id: string
  type: 'text' | 'tool_use' | 'tool_result' | 'step-start' | 'step-finish'
  text?: string
  tool?: string
  callID?: string
  state?: ToolState
}

export interface ToolCall {
  id: string
  tool: string
  parameters: Record<string, any>
  result?: ToolResult
  status: 'pending' | 'running' | 'completed' | 'error'
}

export interface ToolResult {
  title: string
  output: string
  metadata?: Record<string, any>
  error?: string
}

export interface ToolState {
  status: 'idle' | 'running' | 'completed' | 'error'
  input?: Record<string, any>
  output?: string
  error?: string
  time?: {
    start: number
    end?: number
  }
}

// Polza API types
export interface PolzaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface PolzaChatRequest {
  model: string
  messages: PolzaMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  tools?: Tool[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface PolzaChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface PolzaStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    delta: {
      role?: string
      content?: string
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason: string | null
  }[]
}

// Tool definitions
export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

// File system types
export interface FileSystemEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: number
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64'
}

// Chat session types
export interface ChatSession {
  id: string
  messages: Message[]
  model: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
}

// Tool execution types
export interface ToolExecutionRequest {
  tool: string
  parameters: Record<string, any>
  sessionId?: string
}

export interface ToolExecutionResponse {
  success: boolean
  result?: ToolResult
  error?: string
}

// Available tools based on agent_polza2
export type AvailableTools =
  | 'bash'
  | 'read'
  | 'write'
  | 'edit'
  | 'list'
  | 'glob'
  | 'grep'
  | 'websearch'
  | 'codesearch'
  | 'batch'
  | 'task'
  | 'todowrite'
  | 'todoread'
  | 'webfetch'

// Tool parameter types
export interface BashParams {
  command: string
  description?: string
  timeout?: number
  run_in_background?: boolean
}

export interface ReadParams {
  file_path: string
  offset?: number
  limit?: number
}

export interface WriteParams {
  file_path: string
  content: string
}

export interface EditParams {
  file_path: string
  old_string: string
  new_string: string
  replace_all?: boolean
}

export interface ListParams {
  path: string
  recursive?: boolean
}

export interface GlobParams {
  pattern: string
  path?: string
}

export interface GrepParams {
  pattern: string
  path?: string
  output_mode?: 'content' | 'files_with_matches' | 'count'
  '-i'?: boolean
  '-n'?: boolean
  '-A'?: number
  '-B'?: number
  '-C'?: number
  type?: string
  glob?: string
}

export interface WebSearchParams {
  query: string
  numResults?: number
}

export interface CodeSearchParams {
  query: string
}

export interface BatchParams {
  tool_calls: Array<{
    tool: string
    parameters: Record<string, any>
  }>
}

export interface TaskParams {
  description: string
  prompt: string
  subagent_type: string
  model?: string
}

export interface WebFetchParams {
  url: string
  prompt: string
}

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

export interface TodoWriteParams {
  todos: TodoItem[]
}
