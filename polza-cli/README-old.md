# Polza CLI

A command-line interface client with chat support and file system access using Polza AI.

## Overview

Polza CLI is an interactive command-line tool that provides:

- **AI-Powered Chat**: Conversational interface using Polza AI's language models
- **File System Access**: Built-in tools for reading, writing, and managing files
- **Tool Calling**: Automatic tool execution based on conversation context
- **Conversation History**: Maintains context throughout your session

## Features

- ✅ **Interactive Chat Interface**: Natural language conversations with AI
- ✅ **File System Tools**: Read, write, list, create, and delete files/directories
- ✅ **Polza AI Integration**: Access to multiple AI models (Anthropic Claude, OpenAI GPT, DeepSeek, etc.)
- ✅ **Tool Calling Support**: AI automatically uses tools when needed
- ✅ **Persistent Session History**: Conversation context maintained during session
- ✅ **Session Management**: Save and load chat sessions for later
- ✅ **Markdown Rendering**: Beautiful terminal rendering of markdown responses
- ✅ **Automatic Logging**: All interactions logged to `~/.config/polza-cli/logs`
- ✅ **Cost Tracking**: See token usage and costs for each request
- ✅ **History Navigation**: Browse and restore previous conversations

## Prerequisites

- Node.js >= 18.0.0
- Polza AI API key (get one at [polza.ai](https://polza.ai))

## Installation

### Option 1: Run Directly

```bash
cd polza-cli
chmod +x src/index.js
./src/index.js
```

### Option 2: Install Locally

```bash
cd polza-cli
npm install
npm start
```

### Option 3: Install Globally

```bash
cd polza-cli
npm install -g .
polza-cli
```

## Configuration

### Set Your API Key

You need a Polza AI API key to use this CLI. Set it as an environment variable:

```bash
export POLZA_API_KEY=ak_your_api_key_here
```

Or create a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your API key
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POLZA_API_KEY` | - | **Required** - Your Polza AI API key |
| `POLZA_API_BASE` | `https://api.polza.ai/api/v1` | Polza AI API base URL |
| `POLZA_DEFAULT_MODEL` | `anthropic/claude-sonnet-4.5` | Default AI model to use |
| `POLZA_TEMPERATURE` | `0.7` | Temperature for generation (0.0-2.0) |
| `POLZA_MAX_TOKENS` | `4096` | Maximum tokens for completions |

## Usage

### Starting the CLI

```bash
export POLZA_API_KEY=ak_your_key_here
node src/index.js
```

You'll see a prompt:

```
Polza CLI
Chat with AI and access your file system

Model: anthropic/claude-sonnet-4.5
Session ID: session-2025-12-02T18-30-45-123Z
Config Dir: /home/user/.config/polza-cli
Commands:
  /help      - Show available commands
  /tools     - List available file system tools
  /clear     - Clear conversation history
  /history   - Show conversation history
  /sessions  - List saved sessions
  /save      - Save current session
  /load      - Load a session
  /markdown  - Toggle markdown rendering
  /exit      - Exit the CLI

You >
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help information and usage examples |
| `/tools` | List all available file system tools |
| `/clear` | Clear conversation history |
| `/history` | Display conversation history |
| `/sessions` | List all saved sessions |
| `/save` | Save current session to disk |
| `/load <session-id>` | Load a previously saved session |
| `/markdown` | Toggle markdown rendering on/off |
| `/exit` | Save and exit the CLI |

### Example Conversations

#### Simple Chat

```
You > Hello! What can you help me with?
Assistant > Hello! I can help you with various tasks including:
- File system operations (reading, writing, listing files)
- Answering questions and providing information
- Code analysis and generation
- And much more! What would you like to do?
```

#### File Operations

```
You > Read the contents of README.md
[Tool] Executing read_file...
Assistant > I've read the README.md file. It contains documentation for...

You > List all files in the current directory
[Tool] Executing list_directory...
Assistant > Here are the files in the current directory:
- README.md (file)
- package.json (file)
- src/ (directory)
...
```

#### Create a File

```
You > Create a file called test.txt with the content "Hello World"
[Tool] Executing write_file...
Assistant > I've successfully created test.txt with the content "Hello World".
```

## File System Tools

The CLI provides the following file system tools that the AI can use automatically:

### read_file
Read the contents of a file from the file system.

**Parameters:**
- `file_path` (string) - The absolute or relative path to the file

### write_file
Write content to a file in the file system.

**Parameters:**
- `file_path` (string) - The absolute or relative path to the file
- `content` (string) - The content to write

### list_directory
List files and directories in a given directory.

**Parameters:**
- `directory_path` (string) - The absolute or relative path to the directory

### create_directory
Create a new directory.

**Parameters:**
- `directory_path` (string) - The absolute or relative path to create

### delete_file
Delete a file from the file system.

**Parameters:**
- `file_path` (string) - The absolute or relative path to the file

### file_exists
Check if a file or directory exists.

**Parameters:**
- `path` (string) - The absolute or relative path to check

## Available Models

Polza CLI supports various AI models through Polza AI:

| Provider | Model ID | Description |
|----------|----------|-------------|
| Anthropic | `anthropic/claude-sonnet-4.5` | Latest Claude Sonnet (recommended) |
| Anthropic | `anthropic/claude-3-5-sonnet` | Claude 3.5 Sonnet |
| OpenAI | `openai/gpt-4o` | GPT-4 Optimized |
| OpenAI | `openai/o1-preview` | O1 with reasoning |
| OpenAI | `openai/gpt-4o-mini` | GPT-4 Mini (cost-effective) |
| DeepSeek | `deepseek/deepseek-r1` | DeepSeek R1 with reasoning |
| Google | `google/gemini-pro` | Google Gemini Pro |

To use a different model, set the `POLZA_DEFAULT_MODEL` environment variable:

```bash
export POLZA_DEFAULT_MODEL=openai/gpt-4o
```

## Architecture

### Project Structure

```
polza-cli/
├── src/
│   ├── index.js                   # Main CLI entry point
│   ├── lib/
│   │   ├── polza-client.js        # Polza AI client implementation
│   │   ├── history-manager.js     # Session and history management
│   │   └── markdown-renderer.js   # Markdown rendering utilities
│   └── tools/
│       └── filesystem.js          # File system tools
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### Components

1. **Main CLI (`src/index.js`)**:
   - Interactive chat loop using readline
   - Command handling (/help, /tools, etc.)
   - Conversation history management
   - Tool call orchestration

2. **Polza Client (`src/lib/polza-client.js`)**:
   - HTTP client for Polza AI API
   - Chat completion with tool calling
   - Model listing and configuration

3. **File System Tools (`src/tools/filesystem.js`)**:
   - Tool definitions in OpenAI function calling format
   - Tool execution handlers
   - File system operations

## How It Works

1. **User Input**: You type a message
2. **AI Processing**: The message is sent to Polza AI with available tools
3. **Tool Calling**: If the AI needs to use tools (e.g., read a file), it returns tool calls
4. **Tool Execution**: Tools are executed locally and results are sent back
5. **Final Response**: The AI processes tool results and provides a final answer
6. **History**: All messages and tool calls are stored in conversation history

## Troubleshooting

### "Polza API key is required" Error

**Solution**: Set the `POLZA_API_KEY` environment variable:

```bash
export POLZA_API_KEY=ak_your_key_here
```

Or create a `.env` file with your API key.

### 401 Unauthorized Error

**Problem**: Invalid or expired API key

**Solution**:
1. Verify your API key at [polza.ai/dashboard](https://polza.ai/dashboard)
2. Make sure there are no extra spaces in your key
3. Check if your key has been rotated or expired

### 402 Payment Required Error

**Problem**: Insufficient funds in your Polza AI account

**Solution**: Add funds at [polza.ai/billing](https://polza.ai/billing)

### Connection Errors

**Problem**: Cannot connect to Polza AI API

**Solution**:
1. Check your internet connection
2. Verify the API base URL is correct
3. Check if there are any proxy or firewall issues

## Development

### Running in Development

```bash
cd polza-cli
npm run dev
```

### Code Structure

The code is organized into three main components:

- **CLI Interface**: Interactive readline-based chat interface
- **Polza Client**: HTTP client for Polza AI API
- **Tools**: Modular tool system for file system operations

### Adding New Tools

To add a new tool:

1. Add tool definition to `fileSystemTools` array in `src/tools/filesystem.js`
2. Implement the tool handler in `executeFileSystemTool` function
3. The AI will automatically be able to use the new tool

Example:

```javascript
// 1. Add tool definition
{
  type: 'function',
  function: {
    name: 'my_tool',
    description: 'Description of what this tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Description of param1'
        }
      },
      required: ['param1']
    }
  }
}

// 2. Add handler
case 'my_tool':
  return await myToolHandler(args.param1);
```

## New Features

### Session Management

Save and restore your chat sessions:

```bash
# Save current session
You > /save
Session saved: session-2025-12-02T18-30-45-123Z

# List all saved sessions
You > /sessions
Saved Sessions:
1. session-2025-12-02T18-30-45-123Z
   Date: 12/2/2025, 6:30:45 PM | Size: 4.52 KB

# Load a previous session
You > /load session-2025-12-02T18-30-45-123Z
Session loaded: session-2025-12-02T18-30-45-123Z
Messages: 12
```

All sessions are stored in `~/.config/polza-cli/sessions/`.

### Markdown Rendering

Beautiful terminal rendering of markdown responses with:
- **Syntax highlighting** for code blocks
- **Formatted headers** with colors
- **Bold and italic** text styling
- **Lists** with proper bullets
- **Links** with visible URLs
- **Tables** and horizontal rules

Toggle markdown rendering on/off with `/markdown`.

### Automatic Logging

All interactions are automatically logged to `~/.config/polza-cli/logs/`:
- User inputs
- AI responses
- Tool calls and results
- Token usage and costs
- Error messages

Each session has its own log file with JSON-formatted entries for easy parsing.

### Persistent History

Conversation history is automatically saved after each interaction to `~/.config/polza-cli/history/`, ensuring you never lose your chat context.

## Comparison with Similar CLIs

| Feature | Polza CLI | gemini-cli | k_da | agent_polza2 |
|---------|-----------|------------|------|--------------|
| Runtime | Node.js | Node.js | Node.js | Bun |
| AI Provider | Polza AI | Google Gemini | Koda | OpenCode/Polza |
| Interface | Interactive Chat | TUI + Chat | TUI | JSON Interface |
| File System Tools | ✅ | ✅ | Limited | ✅ |
| Tool Calling | ✅ | ✅ | ❌ | ✅ |
| Session Management | ✅ | ✅ | ❌ | ❌ |
| Markdown Rendering | ✅ | ✅ | ❌ | ❌ |
| Automatic Logging | ✅ | ✅ | ❌ | ❌ |
| History Persistence | ✅ | ✅ | ❌ | ❌ |
| Dependencies | Minimal | Many | Many | Many |
| Simplicity | High | Medium | Low | Medium |

## Security Considerations

- The CLI has full access to your file system
- Be careful when asking the AI to delete files
- Review file paths before confirming destructive operations
- Never share your API key in code or commits
- Use environment variables for sensitive configuration

## License

Unlicense (Public Domain)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Resources

- [Polza AI Official Website](https://polza.ai)
- [Polza AI Documentation](https://docs.polza.ai)
- [Polza AI Dashboard](https://polza.ai/dashboard)
- [API Reference](https://docs.polza.ai/api-reference)

## Support

For issues related to:
- **Polza CLI**: Open an issue in this repository
- **Polza AI API**: Contact support@polza.ai

---

Built with ❤️ using Polza AI
