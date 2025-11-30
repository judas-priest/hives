# Agent Polza2 Analysis and Vue.js Integration Guide

This document provides comprehensive answers to the three key questions from Issue #3:
1. Analyze agent_polza2
2. What is the functionality?
3. How to integrate chat into Vue-JS for use in both chat and tools?

---

## 1. Analysis of agent_polza2

### Overview
`agent_polza2` is a minimal, public domain AI CLI agent that is **100% compatible with OpenCode's JSON interface**. It's specifically built for Bun runtime (not Node.js or Deno) and focuses on providing maximum efficiency with unrestricted execution capabilities.

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Polza Agent CLI                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   OpenCode      │  │     Polza       │  │   Другие     │ │
│  │   Provider      │  │   Provider      │  │  провайдеры  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Provider Manager (src/provider/)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ File Operations │  │  Search Tools   │  │  Execution   │ │
│  │ • read          │  │ • glob          │  │   Tools      │ │
│  │ • write         │  │ • grep          │  │ • bash       │ │
│  │ • edit          │  │ • websearch     │  │ • batch      │ │
│  │ • list          │  │ • codesearch    │  │ • task       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Characteristics

#### 1. **Bun-Only Runtime**
- Requires Bun >= 1.0.0
- Does NOT support Node.js or Deno
- Direct execution without compilation step
- Faster development and performance

#### 2. **OpenCode Compatibility**
- 100% compatible with `opencode run --format json --model opencode/grok-code` output format
- Supports all OpenCode JSON event types: `tool_use`, `text`, `step_start`, `step_finish`, `error`
- Can be used as a drop-in replacement for OpenCode CLI

#### 3. **Dual Input Format Support**
- **Plain Text**: `echo "hello" | agent` (automatically converted to JSON)
- **JSON Format**: `echo '{"message":"hello"}' | agent`

#### 4. **Provider System**
The agent supports multiple AI providers:

**Polza Provider** (Primary focus):
- Uses OpenAI-compatible API at `https://api.polza.ai/api/v1`
- Provides access to Claude models (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- Requires API key: `POLZA_API_KEY` or via config file
- Cost-effective with detailed usage tracking

**OpenCode Provider**:
- Free tier with Grok Code Fast 1 model
- No authentication required for free models
- Premium models require OpenCode Zen subscription

**Other Providers**:
- OpenAI (GPT-4, GPT-5)
- Anthropic (direct Claude access)
- Google (Gemini, Vertex AI)
- AWS Bedrock
- Azure OpenAI

#### 5. **13 Built-in Tools**

**File Operations:**
- `read` - Read file contents with large file support
- `write` - Write files with automatic directory creation
- `edit` - Precise file editing via string replacement
- `list` - List directory contents

**Search Tools:**
- `glob` - Fast file pattern matching (`**/*.js`)
- `grep` - Powerful text search with regex
- `websearch` ✨ - Web search via Exa API (always enabled)
- `codesearch` ✨ - Code search via Exa API (always enabled)

**Execution Tools:**
- `bash` - Execute shell commands with timeout support
- `batch` ✨ - Batch multiple tool calls (always enabled)
- `task` - Launch specialized subagent tasks

**Utility Tools:**
- `todo` - Task tracking and management
- `webfetch` - Fetch and process URLs

✨ = Always enabled (no experimental flags or environment variables needed)

### Directory Structure

```
agent_polza2/
├── src/
│   ├── index.js              # Main entry point with JSON/plain text input
│   ├── agent/
│   │   └── agent.ts          # Core agent implementation
│   ├── provider/
│   │   ├── provider.ts       # Provider management system
│   │   └── models.ts         # Model configurations
│   ├── session/
│   │   ├── agent.js          # Session management
│   │   └── processor.ts      # Event stream processing
│   ├── tool/                 # Tool implementations (13 tools)
│   └── config/
│       └── config.ts         # Configuration loading
├── docs/                     # Documentation and case studies
├── examples/                 # Usage examples
├── polza-config-example.json # Ready-to-use Polza configuration
└── package.json              # Dependencies and metadata
```

### Configuration System

**Configuration File Example** (`polza-config-example.json`):
```json
{
  "provider": {
    "polza": {
      "npm": "@ai-sdk/openai-compatible",
      "api": "https://api.polza.ai/api/v1",
      "name": "Polza AI",
      "env": ["POLZA_API_KEY"],
      "options": {
        "apiKey": "ak_0xCOU-hEsCsImB6r-dg7GChm2LFPQOUL9ROwExY8WBo"
      },
      "models": {
        "claude-sonnet-4.5": {
          "id": "anthropic/claude-sonnet-4.5",
          "name": "Claude Sonnet 4.5",
          "cost": {
            "input": 3,
            "output": 15,
            "cache_read": 0.3,
            "cache_write": 3.75
          },
          "limit": {
            "context": 200000,
            "output": 8192
          }
        }
      }
    }
  }
}
```

---

## 2. Functionality Analysis

### Core Functionality

#### A. **JSON Event Streaming Architecture**
The agent operates on a streaming event model:

1. **Input Processing**
   - Accepts JSON or plain text via stdin
   - Converts plain text to JSON format automatically
   - Validates input structure

2. **Event Stream Output**
   - Real-time streaming of events
   - Pretty-printed JSON for readability
   - OpenCode-compatible schema

**Event Types:**
- `step_start` - Marks beginning of processing step
- `text` - Contains generated text content
- `tool_use` - Describes tool invocation
- `step_finish` - Marks completion of step
- `error` - Reports errors

**Example Event Flow:**
```json
{
  "type": "step_start",
  "timestamp": 1763618628840,
  "sessionID": "ses_560236487ffe3ROK1ThWvPwTEF",
  "part": {
    "id": "prt_a9fdca4e8001APEs6AriJx67me",
    "type": "step-start"
  }
}
{
  "type": "text",
  "timestamp": 1763618629886,
  "sessionID": "ses_560236487ffe3ROK1ThWvPwTEF",
  "part": {
    "id": "prt_a9fdca85c001bVEimWb9L3ya6T",
    "type": "text",
    "text": "Hi! How can I help with your coding tasks today?"
  }
}
{
  "type": "step_finish",
  "timestamp": 1763618629916,
  "sessionID": "ses_560236487ffe3ROK1ThWvPwTEF",
  "part": {
    "id": "prt_a9fdca8ff0015cBrNxckAXI3aE",
    "type": "step-finish",
    "reason": "stop"
  }
}
```

#### B. **Tool Execution System**

**Tool Call Structure:**
```json
{
  "message": "your task description",
  "tools": [
    {
      "name": "tool_name",
      "params": {
        "param1": "value1",
        "param2": "value2"
      }
    }
  ]
}
```

**Batch Tool Example** (multiple operations):
```json
{
  "message": "execute multiple operations",
  "tools": [{
    "name": "batch",
    "params": {
      "tool_calls": [
        {"tool": "list", "parameters": {"path": "src"}},
        {"tool": "glob", "parameters": {"pattern": "**/*.ts"}},
        {"tool": "bash", "parameters": {"command": "npm test"}}
      ]
    }
  }]
}
```

#### C. **Session Management**

Each request creates a unique session:
- Session ID tracking
- Message history preservation
- State management across tool calls
- Internal HTTP server for session coordination (not exposed externally)

#### D. **Model Selection**

**Default Models:**
- Free: `opencode/grok-code` (Grok Code Fast 1)
- Premium: `polza/claude-sonnet-4.5` (Claude Sonnet 4.5)

**Model Specification:**
```bash
# Using default model
echo "hello" | agent

# Using specific model
echo "hello" | agent --model opencode/grok-code
echo "hello" | agent --model polza/claude-sonnet-4.5

# With custom config
echo "hello" | OPENCODE_CONFIG=polza-config-example.json agent --model polza/claude-sonnet-4.5
```

### Polza AI API Capabilities

#### Core Features

1. **🤖 Provider Aggregation**
   - Automatic selection of best provider for each model
   - Unified interface across different AI providers
   - Seamless provider switching

2. **💰 Billing in Rubles**
   - Accurate cost tracking per request
   - Automatic charge calculation
   - Detailed usage reports in response

3. **🧠 Reasoning Tokens**
   - Support for models with internal reasoning process
   - Visible reasoning steps in responses
   - Enhanced problem-solving capabilities

4. **⚡ Streaming**
   - Real-time response delivery via Server-Sent Events (SSE)
   - Progressive content generation
   - Better user experience for long responses

5. **🛠️ Tool Calling (Function Calling)**
   - Models can call external functions
   - Complex multi-step workflows
   - Integration with external services

6. **🎨 Multimodality**
   - Text and image processing in single request
   - Vision capabilities for supported models
   - Rich content understanding

7. **📊 Usage Accounting**
   - Detailed token statistics
   - Cost breakdown (input/output/cache)
   - Performance metrics

#### API Endpoints

**Main Endpoint:**
```
POST https://api.polza.ai/api/v1/chat/completions
```

**Request Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Model ID (e.g., `anthropic/claude-sonnet-4.5`) |
| `messages` | array | Conversation history |
| `max_tokens` | integer | Maximum tokens in response |
| `temperature` | float (0-2) | Generation temperature (0=deterministic, 2=creative) |
| `stream` | boolean | Enable streaming mode |
| `tools` | array | Available function definitions |
| `tool_choice` | string/object | Tool selection strategy |

**Response Structure:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "anthropic/claude-sonnet-4.5",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Response text",
      "reasoning": "Internal reasoning process (if applicable)"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175,
    "prompt_tokens_details": {
      "cached_tokens": 10,
      "text_tokens": 20,
      "image_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 30
    },
    "cost": 15.75
  }
}
```

#### Supported Models

**Claude Models** (via Polza):
- `anthropic/claude-sonnet-4.5` - Most capable, balanced performance
- `anthropic/claude-haiku-4.5` - Fast, cost-effective
- `anthropic/claude-opus-4.1` - Maximum capabilities

**Pricing** (per 1M tokens):
- Input: $3 (Claude Sonnet 4.5)
- Output: $15 (Claude Sonnet 4.5)
- Cache Read: $0.30
- Cache Write: $3.75

---

## 3. Vue.js Integration for Chat and Tools

### Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Vue.js Application                      │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌───────────────────────────────────────────────────┐   │
│  │           Chat Component (Vue SFC)                 │   │
│  │  • Message Display                                 │   │
│  │  • Input Field                                     │   │
│  │  • Tool Execution UI                               │   │
│  └───────────────────────────────────────────────────┘   │
│                          │                                │
│                          ↓                                │
│  ┌───────────────────────────────────────────────────┐   │
│  │         Polza Service Layer                        │   │
│  │  • OpenAI SDK Client                              │   │
│  │  • Message Management                             │   │
│  │  • Tool Call Handling                             │   │
│  └───────────────────────────────────────────────────┘   │
│                          │                                │
│                          ↓                                │
│  ┌───────────────────────────────────────────────────┐   │
│  │         Tool Execution Layer                       │   │
│  │  • Tool Registry                                  │   │
│  │  • Async Tool Execution                           │   │
│  │  • Result Processing                              │   │
│  └───────────────────────────────────────────────────┘   │
│                                                            │
└──────────────────────────────────────────────────────────┘
                          │
                          ↓
            ┌─────────────────────────────┐
            │    Polza AI API              │
            │  https://api.polza.ai        │
            └─────────────────────────────┘
```

### Complete Vue.js Implementation

#### 1. **Basic Chat Component**

```vue
<template>
  <div class="polza-chat-container">
    <!-- Messages Display -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', `message-${message.role}`]"
      >
        <div class="message-header">
          <strong>{{ getRoleName(message.role) }}</strong>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">
          <div v-if="message.content" v-html="formatContent(message.content)"></div>

          <!-- Tool Calls Display -->
          <div v-if="message.tool_calls" class="tool-calls">
            <div v-for="toolCall in message.tool_calls" :key="toolCall.id" class="tool-call">
              <span class="tool-icon">🔧</span>
              <strong>{{ toolCall.function.name }}</strong>
              <pre>{{ JSON.parse(toolCall.function.arguments) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoading" class="loading-indicator">
        <span class="loading-dots">●</span>
        <span class="loading-text">AI is thinking...</span>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-container">
      <textarea
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.enter.shift.exact="inputText += '\n'"
        placeholder="Type your message... (Shift+Enter for new line)"
        :disabled="isLoading"
        rows="3"
      ></textarea>

      <div class="input-actions">
        <!-- Tool Selection -->
        <div class="tool-selection">
          <label>
            <input type="checkbox" v-model="enableTools" />
            Enable Tools
          </label>
          <select v-if="enableTools" v-model="selectedTools" multiple>
            <option value="bash">Bash</option>
            <option value="read">Read File</option>
            <option value="write">Write File</option>
            <option value="list">List Directory</option>
            <option value="websearch">Web Search</option>
          </select>
        </div>

        <button
          @click="sendMessage"
          :disabled="isLoading || !inputText.trim()"
          class="send-button"
        >
          {{ isLoading ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import OpenAI from 'openai';

export default {
  name: 'PolzaChatComponent',

  props: {
    apiKey: {
      type: String,
      required: true
    },
    model: {
      type: String,
      default: 'anthropic/claude-sonnet-4.5'
    },
    systemMessage: {
      type: String,
      default: 'You are a helpful AI assistant with access to various tools.'
    }
  },

  data() {
    return {
      messages: [],
      inputText: '',
      isLoading: false,
      enableTools: false,
      selectedTools: [],
      client: null
    };
  },

  mounted() {
    this.initializeClient();
    this.addSystemMessage();
  },

  methods: {
    initializeClient() {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: 'https://api.polza.ai/api/v1',
        dangerouslyAllowBrowser: true // For client-side usage
      });
    },

    addSystemMessage() {
      this.messages.push({
        role: 'system',
        content: this.systemMessage,
        timestamp: Date.now()
      });
    },

    async sendMessage() {
      if (!this.inputText.trim() || this.isLoading) return;

      // Add user message
      const userMessage = {
        role: 'user',
        content: this.inputText.trim(),
        timestamp: Date.now()
      };
      this.messages.push(userMessage);

      // Clear input
      this.inputText = '';
      this.isLoading = true;

      try {
        // Prepare tools if enabled
        const tools = this.enableTools ? this.getToolDefinitions() : undefined;

        // Call Polza API
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: this.prepareMessagesForAPI(),
          tools: tools,
          tool_choice: tools ? 'auto' : undefined,
          max_tokens: 8192,
          temperature: 0.7
        });

        const assistantMessage = completion.choices[0].message;

        // Add assistant message
        this.messages.push({
          ...assistantMessage,
          timestamp: Date.now()
        });

        // Handle tool calls if present
        if (assistantMessage.tool_calls) {
          await this.handleToolCalls(assistantMessage.tool_calls);
        }

        // Scroll to bottom
        this.$nextTick(() => {
          this.scrollToBottom();
        });

      } catch (error) {
        console.error('Error sending message:', error);
        this.messages.push({
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
          isError: true
        });
      } finally {
        this.isLoading = false;
      }
    },

    async handleToolCalls(toolCalls) {
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Execute tool
        const result = await this.executeTool(toolName, toolArgs);

        // Add tool result message
        const toolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(result),
          timestamp: Date.now()
        };
        this.messages.push(toolMessage);
        toolResults.push(toolMessage);
      }

      // Continue conversation with tool results
      if (toolResults.length > 0) {
        this.isLoading = true;
        try {
          const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: this.prepareMessagesForAPI()
          });

          const assistantMessage = completion.choices[0].message;
          this.messages.push({
            ...assistantMessage,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error continuing conversation:', error);
        } finally {
          this.isLoading = false;
        }
      }
    },

    async executeTool(toolName, args) {
      // This is where you implement actual tool execution
      // In a real application, these would make API calls to your backend

      console.log(`Executing tool: ${toolName}`, args);

      switch (toolName) {
        case 'bash':
          return { stdout: 'Command executed successfully', exitCode: 0 };

        case 'read':
          return { content: 'File content would be here', path: args.file_path };

        case 'write':
          return { success: true, path: args.file_path };

        case 'list':
          return { files: ['file1.txt', 'file2.js', 'dir1/'], path: args.path };

        case 'websearch':
          return {
            results: [
              { title: 'Result 1', url: 'https://example.com', snippet: 'Result snippet' }
            ],
            query: args.query
          };

        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    },

    getToolDefinitions() {
      const availableTools = {
        bash: {
          type: 'function',
          function: {
            name: 'bash',
            description: 'Execute a bash command',
            parameters: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'The bash command to execute'
                },
                description: {
                  type: 'string',
                  description: 'Description of what the command does'
                }
              },
              required: ['command']
            }
          }
        },
        read: {
          type: 'function',
          function: {
            name: 'read',
            description: 'Read contents of a file',
            parameters: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Absolute path to the file'
                }
              },
              required: ['file_path']
            }
          }
        },
        write: {
          type: 'function',
          function: {
            name: 'write',
            description: 'Write content to a file',
            parameters: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Absolute path to the file'
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file'
                }
              },
              required: ['file_path', 'content']
            }
          }
        },
        list: {
          type: 'function',
          function: {
            name: 'list',
            description: 'List files and directories',
            parameters: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to list'
                }
              },
              required: ['path']
            }
          }
        },
        websearch: {
          type: 'function',
          function: {
            name: 'websearch',
            description: 'Search the web for information',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                numResults: {
                  type: 'integer',
                  description: 'Number of results to return',
                  default: 5
                }
              },
              required: ['query']
            }
          }
        }
      };

      return this.selectedTools.map(toolName => availableTools[toolName]).filter(Boolean);
    },

    prepareMessagesForAPI() {
      // Filter and format messages for API
      return this.messages
        .filter(m => m.role !== 'system' || this.messages.indexOf(m) === 0)
        .map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name
        }));
    },

    getRoleName(role) {
      const names = {
        user: 'You',
        assistant: 'AI Assistant',
        system: 'System',
        tool: 'Tool Result'
      };
      return names[role] || role;
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    },

    formatContent(content) {
      // Simple markdown-like formatting
      return content
        .replace(/\n/g, '<br>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    },

    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }
};
</script>

<style scoped>
.polza-chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f9f9f9;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message-user {
  background: #e3f2fd;
  margin-left: 40px;
}

.message-assistant {
  background: #f5f5f5;
  margin-right: 40px;
}

.message-tool {
  background: #fff3cd;
  font-size: 0.9em;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #666;
}

.message-content {
  line-height: 1.6;
}

.tool-calls {
  margin-top: 12px;
  padding: 8px;
  background: #fff;
  border-left: 3px solid #2196F3;
}

.tool-call {
  margin-bottom: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.tool-call pre {
  margin: 4px 0 0 0;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85em;
}

.tool-icon {
  margin-right: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: #666;
  font-style: italic;
}

.loading-dots {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.input-container {
  border-top: 1px solid #ddd;
  padding: 16px;
  background: #fff;
}

.input-container textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.tool-selection {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.tool-selection select {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-width: 300px;
}

.send-button {
  padding: 10px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #1976D2;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

#### 2. **Composable for Polza Service** (Vue 3 Composition API)

```javascript
// composables/usePolza.js
import { ref, computed } from 'vue';
import OpenAI from 'openai';

export function usePolza(config = {}) {
  const {
    apiKey = '',
    baseURL = 'https://api.polza.ai/api/v1',
    model = 'anthropic/claude-sonnet-4.5'
  } = config;

  const messages = ref([]);
  const isLoading = ref(false);
  const client = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true
  });

  const conversationCost = computed(() => {
    // Calculate total cost based on usage data
    return messages.value
      .filter(m => m.usage)
      .reduce((total, m) => total + (m.usage.cost || 0), 0);
  });

  async function sendMessage(content, options = {}) {
    isLoading.value = true;

    try {
      const userMessage = { role: 'user', content, timestamp: Date.now() };
      messages.value.push(userMessage);

      const completion = await client.chat.completions.create({
        model,
        messages: messages.value.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name
        })),
        ...options
      });

      const assistantMessage = {
        ...completion.choices[0].message,
        timestamp: Date.now(),
        usage: completion.usage
      };

      messages.value.push(assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error('Polza API error:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function sendWithTools(content, tools, toolExecutor) {
    const initialResponse = await sendMessage(content, {
      tools,
      tool_choice: 'auto'
    });

    if (initialResponse.tool_calls) {
      for (const toolCall of initialResponse.tool_calls) {
        const result = await toolExecutor(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );

        messages.value.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
          timestamp: Date.now()
        });
      }

      // Continue conversation with tool results
      return await sendMessage(null);
    }

    return initialResponse;
  }

  function clearMessages() {
    messages.value = [];
  }

  function addSystemMessage(content) {
    messages.value.unshift({
      role: 'system',
      content,
      timestamp: Date.now()
    });
  }

  return {
    messages,
    isLoading,
    conversationCost,
    sendMessage,
    sendWithTools,
    clearMessages,
    addSystemMessage
  };
}
```

#### 3. **Server-Side Tool Execution** (Node.js/Express Backend)

For production applications, tool execution should happen on the server:

```javascript
// server/routes/polza-tools.js
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const router = express.Router();

// Tool execution endpoint
router.post('/execute-tool', async (req, res) => {
  const { toolName, parameters } = req.body;

  try {
    let result;

    switch (toolName) {
      case 'bash':
        result = await executeBash(parameters);
        break;
      case 'read':
        result = await readFile(parameters);
        break;
      case 'write':
        result = await writeFile(parameters);
        break;
      case 'list':
        result = await listDirectory(parameters);
        break;
      case 'websearch':
        result = await performWebSearch(parameters);
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function executeBash(params) {
  const { command, description } = params;

  // Security: validate command, implement whitelist, etc.
  if (!isCommandSafe(command)) {
    throw new Error('Unsafe command detected');
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    return {
      stdout,
      stderr,
      exitCode: 0,
      description
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
      description
    };
  }
}

async function readFile(params) {
  const { file_path } = params;

  // Security: validate path, prevent directory traversal
  const safePath = path.resolve('/safe/base/directory', file_path);

  const content = await fs.readFile(safePath, 'utf-8');
  return {
    content,
    path: file_path,
    size: content.length
  };
}

async function writeFile(params) {
  const { file_path, content } = params;

  const safePath = path.resolve('/safe/base/directory', file_path);

  // Ensure directory exists
  await fs.mkdir(path.dirname(safePath), { recursive: true });
  await fs.writeFile(safePath, content, 'utf-8');

  return {
    success: true,
    path: file_path,
    size: content.length
  };
}

async function listDirectory(params) {
  const { path: dirPath } = params;

  const safePath = path.resolve('/safe/base/directory', dirPath);
  const entries = await fs.readdir(safePath, { withFileTypes: true });

  return {
    path: dirPath,
    files: entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file'
    }))
  };
}

async function performWebSearch(params) {
  const { query, numResults = 5 } = params;

  // Implement web search using Exa API or similar
  // This is a placeholder implementation
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EXA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      numResults
    })
  });

  const data = await response.json();
  return {
    query,
    results: data.results,
    count: data.results.length
  };
}

function isCommandSafe(command) {
  // Implement command validation logic
  // Whitelist approach is recommended
  const dangerousPatterns = [
    /rm\s+-rf/,
    /sudo/,
    /chmod/,
    /mkfs/,
    /dd\s+if=/
  ];

  return !dangerousPatterns.some(pattern => pattern.test(command));
}

export default router;
```

#### 4. **Usage in Vue Application**

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <h1>Polza AI Chat with Tools</h1>
    <PolzaChatComponent
      :api-key="polzaApiKey"
      model="anthropic/claude-sonnet-4.5"
      system-message="You are a helpful AI assistant with access to file operations, bash commands, and web search."
    />
  </div>
</template>

<script>
import PolzaChatComponent from './components/PolzaChatComponent.vue';

export default {
  name: 'App',
  components: {
    PolzaChatComponent
  },
  data() {
    return {
      // In production, load this from environment variables or secure storage
      polzaApiKey: 'ak_0xCOU-hEsCsImB6r-dg7GChm2LFPQOUL9ROwExY8WBo'
    };
  }
};
</script>
```

### Production-Ready Enhancements

#### 1. **Streaming Support**

```javascript
// composables/usePolzaStreaming.js
export function usePolzaStreaming(config) {
  const { apiKey, baseURL, model } = config;
  const client = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });

  async function streamMessage(messages, onChunk, onComplete) {
    try {
      const stream = await client.chat.completions.create({
        model,
        messages,
        stream: true
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(delta, fullContent);
        }

        if (chunk.choices[0]?.finish_reason) {
          onComplete(fullContent, chunk.usage);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  }

  return { streamMessage };
}
```

#### 2. **Error Handling & Retry Logic**

```javascript
// utils/polzaErrorHandler.js
export class PolzaError extends Error {
  constructor(message, status, type) {
    super(message);
    this.name = 'PolzaError';
    this.status = status;
    this.type = type;
  }
}

export async function withRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export function handlePolzaError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        return new PolzaError('Invalid API key', 401, 'authentication_error');
      case 402:
        return new PolzaError('Insufficient funds', 402, 'payment_required');
      case 429:
        return new PolzaError('Rate limit exceeded', 429, 'rate_limit_error');
      default:
        return new PolzaError(data.error?.message || 'API error', status, 'api_error');
    }
  }

  return new PolzaError('Network error', 0, 'network_error');
}
```

#### 3. **Cost Tracking**

```vue
<!-- CostTracker.vue -->
<template>
  <div class="cost-tracker">
    <h3>Usage Statistics</h3>
    <div class="stat-item">
      <span>Total Messages:</span>
      <strong>{{ totalMessages }}</strong>
    </div>
    <div class="stat-item">
      <span>Total Tokens:</span>
      <strong>{{ formatNumber(totalTokens) }}</strong>
    </div>
    <div class="stat-item">
      <span>Estimated Cost:</span>
      <strong>${{ totalCost.toFixed(4) }}</strong>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    messages: Array
  },
  computed: {
    totalMessages() {
      return this.messages.filter(m => m.role === 'assistant').length;
    },
    totalTokens() {
      return this.messages.reduce((sum, m) => {
        return sum + (m.usage?.total_tokens || 0);
      }, 0);
    },
    totalCost() {
      return this.messages.reduce((sum, m) => {
        return sum + (m.usage?.cost || 0);
      }, 0);
    }
  },
  methods: {
    formatNumber(num) {
      return num.toLocaleString();
    }
  }
};
</script>
```

---

## Best Practices

### Security Considerations

1. **API Key Management**
   - Never expose API keys in client-side code
   - Use environment variables
   - Implement server-side proxy for API calls

2. **Tool Execution Safety**
   - Validate all tool parameters
   - Implement command whitelisting for bash
   - Prevent directory traversal attacks
   - Set execution timeouts
   - Limit resource usage

3. **Rate Limiting**
   - Implement request throttling
   - Monitor usage patterns
   - Set per-user limits

### Performance Optimization

1. **Message Management**
   - Implement message history limits
   - Use pagination for long conversations
   - Cache responses when appropriate

2. **Streaming**
   - Use streaming for long responses
   - Implement progressive rendering
   - Show real-time typing indicators

3. **Tool Execution**
   - Execute tools in parallel when possible
   - Implement timeout handling
   - Cache tool results where appropriate

### User Experience

1. **Visual Feedback**
   - Show loading states clearly
   - Display tool execution progress
   - Provide error messages
   - Show cost/token usage

2. **Message Formatting**
   - Support markdown rendering
   - Syntax highlighting for code
   - Collapsible tool results
   - Timestamp display

3. **Accessibility**
   - Keyboard navigation support
   - ARIA labels for screen readers
   - High contrast mode support
   - Focus management

---

## Conclusion

This comprehensive guide covers:

1. **agent_polza2 Analysis**: Architecture, capabilities, and technical implementation
2. **Functionality**: Core features, API capabilities, tool system, and integration patterns
3. **Vue.js Integration**: Complete implementation with chat UI, tool execution, and production-ready features

The solution provides a full-stack approach to integrating Polza AI with Vue.js, including both client and server-side components, security considerations, and best practices for production deployments.

For additional examples and detailed API documentation, refer to:
- `agent_polza2/INTEGRATIONS.md` - Integration patterns
- `agent_polza2/TOOLS.md` - Tool documentation
- `agent_polza2/QUICKSTART.md` - Quick start guide
- `polza.txt` - Polza AI API reference
