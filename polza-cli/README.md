# Polza CLI (Enhanced Edition)

A powerful command-line interface client with AI chat, file system access, and advanced features inspired by gemini-cli.

## 🚀 New Features (Gemini-CLI Inspired)

This enhanced version includes all features from the original gemini-cli:

✅ **File Inclusion (@file.js, @src/)** - Include file contents directly in prompts
✅ **Shell Execution (!command)** - Execute shell commands within prompts (YOLO mode)
✅ **Command-Line Flags** - `-p` (non-interactive), `-m` (model selection), `--yolo`, `--help`
✅ **CLI Commands** - `/help`, `/exit`, `/clear`, `/memory`, `/tools`, `/settings`, `/restore`
✅ **Built-in Tools** - grep, shell execution, file operations, glob patterns
✅ **YOLO Mode** - `--yolomode` flag disables confirmations (use with caution!)
✅ **Custom Commands** - Define custom commands via TOML files
✅ **Persistent Memory** - Store and retrieve information across sessions
✅ **Settings Management** - Configure and save preferences

## 🆕 Latest Enhancements (v1.0.0)

Based on user feedback and gemini-cli inspiration, we've added these powerful new features:

### 1. **Enhanced Command Preview System** 🎯
- **Interactive Preview**: Visual command and file previews appear as you type (like zsh)
- **Fuzzy Matching**: Intelligent command matching - type `/mem` and see all memory commands
- **Highlighted Matches**: Matching characters are highlighted in preview for clarity
- **Rich Icons**: File-type specific icons (📜 for JS, 📘 for TS, 🐍 for Python, etc.)
- **Colorized Output**: Beautiful syntax highlighting in preview panels
- **Smart Hints**: Helpful keyboard shortcuts displayed in preview

### 2. **Tab Autocompletion** ⌨️
- **Command Completion**: Press TAB while typing `/help` → automatically completes to `/help`
- **File Path Completion**: Type `@README` and press TAB → suggests matching files
- **Subcommand Completion**: Type `/memory ` and press TAB → shows available subcommands
- **Fuzzy Search**: Tab completion now uses fuzzy matching for better suggestions
- Works with both `/` commands and `@` file references

### 3. **Inline Suggestions** 💡
- **History-based Suggestions**: Get suggestions based on your command history
- **zsh-autosuggestions Style**: Similar to zsh-autosuggestions plugin
- **Smart Completion**: Suggests most relevant commands as you type

### 4. **Enhanced Shell Execution** 🔧
Now supports **both syntaxes** for shell commands:
- **Direct syntax**: `!ls -la` (NEW! simpler and cleaner)
- **Braced syntax**: `!{ls -la}` (original syntax, still supported)

Example:
```bash
You > Show files: !ls -la
You > What's my directory? !pwd
```

### 5. **Custom Instructions (POLZA.md)** 📝
Like GEMINI.md, but for Polza CLI! Define project-specific instructions that the AI will follow:

- Create with `/init` command
- Place in project root or home directory
- Automatically loaded on startup
- Hierarchical loading (project > parent > home > global)
- View with `/memory show`
- Reload with `/memory refresh`

Example POLZA.md:
```markdown
# Project Instructions
- Use TypeScript for all new files
- Follow functional programming patterns
- Add JSDoc comments for public functions
```

### 6. **Session Management** 💾
- **Save to specific folders**: Sessions are now project-scoped
- **Better organization**: Each project gets its own session directory
- **Easy restoration**: `/restore` command lists all available sessions

### 7. **Improved Memory Management** 🧠
- `/memory show` - View custom instructions from POLZA.md files
- `/memory refresh` - Reload POLZA.md without restarting
- Better visibility of loaded configuration files

### 8. **Version Command** ℹ️
- `/version` - Display version information, platform details, and feature list
- Quick access to CLI capabilities and system information

## Overview

Polza CLI provides:

- **AI-Powered Chat**: Conversational interface using Polza AI's language models
- **File System Access**: Built-in tools for reading, writing, and managing files
- **Advanced Tools**: grep, shell execution, glob patterns, web search (placeholder)
- **Tool Calling**: Automatic tool execution based on conversation context
- **File Inclusion Syntax**: `@file.js` to include files directly in prompts
- **Shell Command Execution**: `!ls -la` or `!{ls -la}` to run shell commands (requires YOLO mode)
- **Custom Commands**: Define reusable prompts via TOML files
- **Persistent Memory**: Remember information across sessions with `/memory`
- **Settings Management**: Configure preferences with `/settings`
- **Conversation History**: Maintains context throughout your session
- **Session Management**: Save and restore chat sessions

## Prerequisites

- Node.js >= 18.0.0
- Polza AI API key (get one at [polza.ai](https://polza.ai))

## Installation

### Option 1: Run Directly

```bash
cd polza-cli
chmod +x src/index.js
npm install
./src/index.js
```

### Option 2: Install Globally

```bash
cd polza-cli
npm install -g .
polza-cli
```

## Configuration

### Set Your API Key

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

### Basic Usage

```bash
export POLZA_API_KEY=ak_your_key_here
polza-cli
```

### Non-Interactive Mode

```bash
# Run a single prompt
polza-cli -p "Explain @README.md"

# With file inclusion
polza-cli -p "Analyze @src/index.js and suggest improvements"
```

### YOLO Mode (Shell Execution)

```bash
# Enable shell command execution
polza-cli --yolo

# Or use short form
polza-cli -y

# Use in non-interactive mode
polza-cli -p "Show directory: !ls -la" --yolo
```

### Model Selection

```bash
# Use a different model
polza-cli -m "openai/gpt-4o"

# Combine with other flags
polza-cli -m "openai/gpt-4o-mini" --yolo
```

### Interactive Mode with Initial Prompt

```bash
# Start with a prompt, then continue interactively
polza-cli -i "Help me understand this codebase"
```

## Command-Line Flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--prompt` | `-p` | Run in non-interactive mode with a prompt |
| `--prompt-interactive` | `-i` | Start with a prompt, then enter interactive mode |
| `--model` | `-m` | Select the AI model to use |
| `--yolomode` | `--yolo` | Enable YOLO mode (auto-approve shell commands) |
| `--output-format` | `-o` | Output format (`text` or `json`) |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

## Built-in Commands

| Command | Description |
|---------|-------------|
| `/help` | Show help information and usage examples |
| `/tools` | List all available tools (file system, grep, shell, etc.) |
| `/memory [subcommand]` | Manage persistent memory and POLZA.md |
| `/settings [subcommand]` | View/modify settings |
| `/init [filename]` | Create a POLZA.md file with template |
| `/restore [session-id]` | Restore a saved session |
| `/clear` | Clear conversation history |
| `/history` | Display conversation history |
| `/sessions` | List all saved sessions |
| `/save` | Save current session to disk |
| `/load <session-id>` | Load a previously saved session |
| `/markdown` | Toggle markdown rendering on/off |
| `/yolo` | Toggle YOLO mode on/off |
| `/exit` | Save and exit the CLI |

## Special Syntax

### File Inclusion (`@file.js`, `@src/`)

Include file contents directly in your prompts:

```
@file.js                    - Include a specific file
@src/                       - Include directory listing
@./relative/path/file.txt   - Relative paths
@"path with spaces/file.js" - Quoted paths for files with spaces
```

**Examples:**

```
You > Explain @README.md

You > What does @src/index.js do?

You > Compare @package.json and @package-lock.json

You > Analyze all files in @src/
```

When you use `@file.js`, the CLI:
1. Reads the file content
2. Wraps it in XML-style tags: `<file path="...">content</file>`
3. Includes it in your prompt to the AI
4. The AI can then analyze, explain, or work with the file

### Shell Execution (`!command` or `!{command}`)

Execute shell commands within your prompts (requires `--yolo` mode):

```
!ls -la          - List files (new simpler syntax)
!pwd             - Print working directory
!git status      - Run git commands
!{grep -r "TODO"}  - Search files (braced syntax still supported)
```

**Examples:**

```bash
# Start with YOLO mode
polza-cli --yolo

You > What files are in this directory? !ls -la

You > Show git status: !{git status}

You > Find all TODO comments: !{grep -r "TODO" src/}
```

**Safety Note**: Shell commands are disabled by default. You must explicitly enable YOLO mode with `--yolo` flag. Use with caution!

## Memory Management (`/memory`)

Store and retrieve information across sessions:

### Memory Subcommands

| Subcommand | Usage | Description |
|-----------|-------|-------------|
| `set` | `/memory set <key> <value>` | Save a memory |
| `get` | `/memory get <key>` | Retrieve a memory |
| `list` | `/memory list` | List all memories |
| `search` | `/memory search <query>` | Search memories |
| `delete` | `/memory delete <key>` | Delete a memory |
| `clear` | `/memory clear` | Clear all memories |
| `show` | `/memory show` | Show custom instructions from POLZA.md |
| `refresh` | `/memory refresh` | Reload POLZA.md files |

### Memory Examples

```
You > /memory set project-name "My Awesome Project"
Memory saved: project-name = My Awesome Project

You > /memory set api-key "secret123"
Memory saved: api-key = secret123

You > /memory list
Memory Entries:
  project-name: My Awesome Project
  api-key: secret123

You > /memory get project-name
project-name: My Awesome Project

You > /memory search "project"
Search Results:
  project-name: My Awesome Project

You > /memory delete api-key
Memory deleted: api-key
```

Memory is stored in `~/.config/polza-cli/memory.json` and persists across sessions.

## Settings Management (`/settings`)

Configure and save your preferences:

### Settings Subcommands

| Subcommand | Usage | Description |
|-----------|-------|-------------|
| `set` | `/settings set <key> <value>` | Change a setting |
| `get` | `/settings get <key>` | Get a setting value |
| `reset` | `/settings reset` | Reset to defaults |
| `path` | `/settings path` | Show settings file path |
| (none) | `/settings` | Show all current settings |

### Settings Examples

```
You > /settings
Current Settings:
  model: anthropic/claude-sonnet-4.5
  temperature: 0.7
  maxTokens: 4096
  markdownEnabled: true
  yolomode: false

You > /settings set model "openai/gpt-4o"
Setting saved: model = openai/gpt-4o

You > /settings set temperature 0.9
Setting saved: temperature = 0.9

You > /settings get model
model: openai/gpt-4o

You > /settings reset
Settings reset to defaults
```

Settings are stored in `~/.config/polza-cli/settings.json`.

## Custom Commands (TOML Files)

Define reusable prompts in TOML files for common tasks.

### Command Directories

Commands are loaded from these directories (in priority order):

1. `.polza/commands/` - Project-specific commands
2. `~/.polza-cli/commands/` - User-global commands
3. `polza-cli/commands/` - Built-in commands

### TOML Command Format

```toml
description = "Command description"

prompt = """
Your prompt template here.
Use {{args}} to insert command arguments.
"""

[[examples]]
usage = "/command-name argument"
description = "Example description"
```

### Built-in Custom Commands

#### `/grep-code` - Search code files

```bash
You > /grep-code TODO
# Searches for "TODO" and summarizes findings
```

#### `/analyze-file` - Analyze a file

```bash
You > /analyze-file src/index.js
# Provides detailed analysis of the file
```

#### `/test-gen` - Generate unit tests

```bash
You > /test-gen src/utils/helpers.js
# Generates comprehensive unit tests
```

### Creating Custom Commands

Create `~/.polza-cli/commands/my-command.toml`:

```toml
description = "My custom command"

prompt = """
Please help me with: {{args}}

Additional instructions...
"""

[[examples]]
usage = "/my-command some argument"
description = "Example usage"
```

Then use it:

```
You > /my-command fix this bug
```

### Advanced: Using Special Syntax in Commands

Commands can use `@file` and `!{shell}` syntax:

```toml
description = "Analyze git status"

prompt = """
Please analyze the git repository status:

Git Status:
!{git status}

Recent Commits:
!{git log -5 --oneline}

Analyze: {{args}}
"""
```

## Available Tools

The AI can automatically use these tools:

### File System Tools

- `read_file` - Read file contents
- `write_file` - Create or modify files
- `list_directory` - List directory contents
- `create_directory` - Create directories
- `delete_file` - Delete files
- `file_exists` - Check if file/directory exists

### Advanced Tools

- `grep_files` - Search for patterns in files (regex support)
- `execute_shell` - Run shell commands (requires YOLO mode)
- `web_search` - Search the web (placeholder - needs API integration)
- `glob_files` - Find files matching glob patterns

## Example Workflows

### 1. Analyze a Project

```bash
polza-cli

You > Analyze @README.md and tell me what this project does

You > List all JavaScript files using the glob tool

You > Search for all TODO comments in the codebase

You > /save
Session saved
```

### 2. Generate Tests with YOLO Mode

```bash
polza-cli --yolo

You > /test-gen src/utils/helpers.js

You > Run the tests: !{npm test}

You > Show test coverage: !{npm run coverage}
```

### 3. Quick File Analysis (Non-Interactive)

```bash
polza-cli -p "Summarize @package.json and list all dependencies"

polza-cli -p "Explain what @src/index.js does in simple terms"

polza-cli -p "Compare @.env.example and suggest what's missing" -m "openai/gpt-4o"
```

### 4. Code Review with File Inclusion

```bash
You > Review @src/components/Header.js for best practices

You > Compare @src/old-api.js and @src/new-api.js and explain the differences

You > Check if @tests/unit/helpers.test.js covers all functions in @src/utils/helpers.js
```

### 5. Using Memory Across Sessions

```bash
# Session 1
You > /memory set preferred-style "Use functional components with hooks"
You > /memory set api-endpoint "https://api.example.com/v1"
You > /exit

# Session 2 (later)
You > What's my preferred coding style?
Assistant > Let me check your memory...
# AI uses memory_get tool automatically

You > Generate a component following my preferred style
```

## Available Models

Polza CLI supports various AI models through Polza AI:

| Provider | Model ID | Description |
|----------|----------|-------------|
| Anthropic | `anthropic/claude-sonnet-4.5` | Latest Claude Sonnet (default) |
| Anthropic | `anthropic/claude-3-5-sonnet` | Claude 3.5 Sonnet |
| OpenAI | `openai/gpt-4o` | GPT-4 Optimized |
| OpenAI | `openai/o1-preview` | O1 with reasoning |
| OpenAI | `openai/gpt-4o-mini` | GPT-4 Mini (cost-effective) |
| DeepSeek | `deepseek/deepseek-r1` | DeepSeek R1 with reasoning |
| Google | `google/gemini-pro` | Google Gemini Pro |

Change model:

```bash
polza-cli -m "openai/gpt-4o"

# Or in-session
You > /settings set model "openai/gpt-4o"
```

## Architecture

### Project Structure

```
polza-cli/
├── src/
│   ├── index.js                   # Main CLI entry point (enhanced)
│   ├── lib/
│   │   ├── polza-client.js        # Polza AI API client
│   │   ├── history-manager.js     # Session history management
│   │   ├── markdown-renderer.js   # Markdown rendering
│   │   ├── prompt-processor.js    # @file and !{shell} processor
│   │   ├── command-loader.js      # TOML command loader
│   │   ├── memory-manager.js      # Persistent memory system
│   │   └── settings-manager.js    # Settings management
│   └── tools/
│       ├── filesystem.js          # File system tools
│       └── advanced.js            # grep, shell, web_search, glob
├── commands/                      # Built-in TOML commands
│   ├── grep-code.toml
│   ├── analyze-file.toml
│   └── test-gen.toml
├── package.json
└── README.md
```

### How It Works

1. **User Input**: You type a message (with optional `@file` or `!{shell}` syntax)
2. **Prompt Processing**: `@file` includes are resolved, `!{shell}` commands executed (if YOLO mode)
3. **AI Processing**: Processed prompt sent to Polza AI with available tools
4. **Tool Calling**: AI decides which tools to use (read_file, grep_files, etc.)
5. **Tool Execution**: Tools execute locally, results sent back to AI
6. **Final Response**: AI processes tool results and provides answer
7. **History**: All messages and tool calls stored in conversation history

## Security Considerations

- The CLI has full access to your file system
- **YOLO Mode Warning**: Shell execution (`!{command}`) bypasses confirmations
- Review file paths before confirming destructive operations
- Never share your API key in code or commits
- Use environment variables for sensitive configuration
- Custom commands from untrusted sources could be dangerous

## Troubleshooting

### "Polza API key is required" Error

**Solution**: Set the `POLZA_API_KEY` environment variable:

```bash
export POLZA_API_KEY=ak_your_key_here
```

### Shell Commands Not Working

**Problem**: `!{command}` syntax not executing

**Solution**: Enable YOLO mode:

```bash
polza-cli --yolo
```

Or toggle in-session:

```
You > /yolo
YOLO mode ENABLED
```

### File Not Found with `@file` Syntax

**Problem**: `@file.js` shows "File not found"

**Solutions**:
- Use absolute paths: `@/full/path/to/file.js`
- Use relative paths from current directory: `@./src/file.js`
- Quote paths with spaces: `@"path with spaces/file.js"`
- The CLI will try to find the file with glob patterns if exact path fails

### Custom Commands Not Loading

**Problem**: `/my-command` shows "Command not found"

**Solutions**:
- Check TOML syntax is valid
- Ensure file is in one of the command directories
- Verify the `prompt` field exists in the TOML file
- Check file permissions

## Comparison with gemini-cli

| Feature | Polza CLI | gemini-cli |
|---------|-----------|------------|
| Runtime | Node.js | Node.js |
| AI Provider | Polza AI (multi-provider) | Google Gemini |
| File Inclusion (`@file`) | ✅ | ✅ |
| Shell Execution (`!{cmd}`) | ✅ (YOLO mode) | ✅ |
| Custom Commands (TOML) | ✅ | ✅ |
| CLI Flags (-p, -m, --yolo) | ✅ | ✅ |
| Built-in Tools | ✅ | ✅ |
| Grep Tool | ✅ | ✅ |
| Memory Management | ✅ | ✅ (different impl) |
| Settings Management | ✅ | ✅ (different impl) |
| Session Management | ✅ | ✅ |
| Markdown Rendering | ✅ | ✅ |
| Web Search | 🚧 (placeholder) | ✅ |
| MCP Support | ❌ | ✅ |
| Free Tier | Based on Polza AI | Yes (60 req/min) |

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Adding New Tools

To add a new tool:

1. Add tool definition to `src/tools/advanced.js` or `src/tools/filesystem.js`
2. Implement the tool handler function
3. The AI will automatically be able to use the new tool

Example:

```javascript
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
```

## License

Unlicense (Public Domain)

## Resources

- [Polza AI Official Website](https://polza.ai)
- [Polza AI Documentation](https://docs.polza.ai)
- [Polza AI Dashboard](https://polza.ai/dashboard)
- [API Reference](https://docs.polza.ai/api-reference)
- [gemini-cli (inspiration)](https://github.com/google-gemini/gemini-cli)

## Support

For issues related to:
- **Polza CLI**: Open an issue in this repository
- **Polza AI API**: Contact support@polza.ai

---

Built with ❤️ using Polza AI | Enhanced with gemini-cli features
