# Hives Modern CLI

[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](../LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

**A modern, beautiful command-line interface inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli), powered by Polza AI.**

Hives Modern CLI brings AI-powered assistance directly into your terminal with a clean, intuitive interface and powerful features for developers.

## ✨ Features

### Core Features
- 🎨 **Beautiful Terminal UI** - Gradient banners, colored output, and markdown rendering
- 🤖 **AI-Powered** - Chat with Claude, GPT-4, and other models via Polza AI
- 🔧 **Built-in Tools** - File operations, shell commands, glob patterns, web fetch
- 📝 **File Inclusion** - Use `@file.js` syntax to include files in prompts
- 🖼️ **Multimodal Support** - Include images in prompts with `@image.png`
- 💾 **Session Management** - Save, restore, and export conversations
- ⚡ **Streaming Responses** - Real-time AI responses (toggle with `/stream`)
- 🚀 **Shell Execution** - Run shell commands with `!ls -la` (YOLO mode)
- 💬 **Interactive & Non-Interactive** - Use in chat mode or for quick queries
- 🎯 **Multiple Output Formats** - Text, JSON, or streaming JSON
- ⌨️ **Autocomplete & Fuzzy Search** - Tab completion for commands, files, and history
- ⌨️ **Slash Commands** - Quick access to features with `/help`, `/model`, etc.

### Advanced Features (NEW!)
- 📋 **Context Files (HIVES.md)** - Hierarchical project-specific instructions
- 🔧 **Custom Commands** - TOML-based workflow automation
- ⚙️ **Settings System** - Hierarchical configuration (global + project)
- 🌐 **Web Fetch Tool** - Retrieve content from URLs
- 📊 **Statistics** - Track token usage and conversation metrics
- 📤 **Session Export** - Export conversations to Markdown or JSON
- 📋 **Clipboard Integration** - Copy responses directly to clipboard
- 🎨 **Theme System** - 7 built-in themes + custom theme support
- 💾 **Checkpointing** - Git-based undo for AI file modifications
- 🔌 **MCP Protocol** - Extensibility via Model Context Protocol servers
- ⌨️ **Vim Mode** - Full vim keybindings for power users
- 🎨 **Customizable** - Extensive settings for UI, behavior, and tools

## 📦 Installation

### Prerequisites

- Node.js version 18 or higher
- Polza AI API key (get one at [polza.ai](https://polza.ai))

### Install

```bash
cd modern-cli
npm install
```

### Set Your API Key

```bash
export POLZA_API_KEY=ak_your_key_here
```

Make it permanent:

```bash
# For bash
echo 'export POLZA_API_KEY=ak_your_key_here' >> ~/.bashrc

# For zsh
echo 'export POLZA_API_KEY=ak_your_key_here' >> ~/.zshrc
```

## 🚀 Usage

### Interactive Mode

Start a conversation with AI:

```bash
node src/index.js
```

You'll see a beautiful welcome banner and can start chatting immediately:

```
You > Explain async/await in JavaScript

Assistant > [AI response with markdown formatting]
```

### Non-Interactive Mode

Get quick answers without entering interactive mode:

```bash
node src/index.js -p "Explain how promises work"
```

### Command-Line Options

```bash
node src/index.js [options]

Options:
  -p, --prompt <text>          Single prompt (non-interactive)
  -m, --model <model>         AI model to use
  -o, --output-format <fmt>   Output format: text, json, stream-json
  --include-directories <dirs> Additional directories (comma-separated)
  --yolo, --yolomode          Enable YOLO mode (auto-execute shell commands)
  -h, --help                  Show help
  -v, --version               Show version
```

### Examples

```bash
# Interactive chat
node src/index.js

# Quick question
node src/index.js -p "What is the capital of France?"

# Use specific model
node src/index.js -m "openai/gpt-4o"

# JSON output (for scripting)
node src/index.js -p "List 3 programming languages" -o json

# YOLO mode (shell commands auto-execute)
node src/index.js --yolo
```

## 💬 Slash Commands

Use these commands during interactive sessions:

### Basic Commands
| Command | Description |
|---------|-------------|
| `/help` | Show help and available commands |
| `/exit` | Exit the CLI |
| `/quit` | Alias for /exit |
| `/clear` | Clear the screen |
| `/history` | Show conversation history |
| `/reset` | Clear conversation history |
| `/version` | Show version information |

### Configuration Commands
| Command | Description |
|---------|-------------|
| `/model [name]` | Change or show current AI model |
| `/yolo` | Toggle YOLO mode on/off |
| `/stream` | Toggle streaming mode on/off |
| `/tools` | List available tools |
| `/settings [action]` | View/manage settings |

### Session Management Commands
| Command | Description |
|---------|-------------|
| `/save [name]` | Save current session |
| `/load <name>` | Load saved session |
| `/sessions` | List all saved sessions |
| `/export <format>` | Export session (markdown/json) |

### Context & Memory Commands  (NEW!)
| Command | Description |
|---------|-------------|
| `/init` | Create HIVES.md context file |
| `/memory show` | Display loaded context |
| `/memory refresh` | Reload all context files |
| `/memory add <text>` | Add custom memory |
| `/memory list` | List context file paths |

### Utility Commands (NEW!)
| Command | Description |
|---------|-------------|
| `/copy` | Copy last response to clipboard |
| `/stats` | Show conversation statistics |
| `/fetch <url>` | Fetch content from URL |
| `/commands` | List custom commands |
| `/examples [scope]` | Create example custom commands |
| `/theme [name]` | Change or preview color theme |
| `/checkpoint [action]` | Manage file checkpoints |
| `/restore <id>` | Restore files from checkpoint |
| `/mcp [action]` | Manage MCP servers and tools |
| `/vim` | Toggle vim keybindings |

## 🎨 Special Syntax

### File Inclusion (`@file`)

Include file contents in your prompts:

```
You > Explain this code: @src/index.js

You > Compare @package.json and @package-lock.json

You > List files in @src/
```

When you use `@file.js`, the CLI:
1. Reads the file content
2. Wraps it in XML-style tags
3. Includes it in your prompt to the AI

### Image Inclusion (`@image`)

Include images for multimodal AI analysis:

```
You > What's in this screenshot? @screenshot.png

You > Analyze this diagram @architecture.jpg

You > Compare @photo1.png and @photo2.png
```

Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP, SVG

Images are automatically converted to base64 data URLs and sent to the AI.

### Shell Execution (`!command`)

Execute shell commands within prompts (requires `--yolo` mode):

```
You > Show current directory: !pwd

You > List files: !ls -la

You > Git status: !{git status}
```

**Safety Note**: Shell commands require YOLO mode (`--yolo` flag). Use with caution!

## 💾 Session Management

Save and restore your conversations for later:

### Save Current Session

```
You > /save my-project-session
✓ Session saved: my-project-session.json
```

### Load Saved Session

```
You > /load my-project-session
✓ Session loaded: my-project-session.json
  Saved at: 2025-12-03T19:25:40.839Z
  Messages: 15
  Model: anthropic/claude-sonnet-4.5
```

### List All Sessions

```
You > /sessions

📁 Saved Sessions:

  my-project-session
    Saved: 12/3/2025, 7:25:40 PM
    Messages: 15 | Model: anthropic/claude-sonnet-4.5

  debug-session
    Saved: 12/2/2025, 3:14:22 PM
    Messages: 8 | Model: openai/gpt-4o
```

Sessions are stored in `~/.hives-cli/sessions/` and include:
- Full conversation history
- Model settings
- YOLO mode state

## 🔧 Available Tools

The AI can automatically use these tools:

### File System Tools

- `read_file` - Read file contents
- `write_file` - Create or modify files
- `list_directory` - List directory contents
- `glob_files` - Find files matching patterns
- `file_exists` - Check if file/directory exists

### Network Tools (NEW!)

- `web_fetch` - Fetch content from URLs (supports HTML and plain text)

### Advanced Tools

- `execute_shell` - Run shell commands (YOLO mode only)

## 📋 Context Files (HIVES.md)

Provide persistent context to the AI with hierarchical HIVES.md files:

### Create a Context File

```bash
# In your project directory
You > /init
✓ Created HIVES.md at: /path/to/project/HIVES.md
```

### Context File Hierarchy

The CLI automatically loads context from:

1. **Global Context**: `~/.hives-cli/HIVES.md` (applies to all projects)
2. **Project Context**: `./HIVES.md` and all parent directories
3. **Subdirectory Context**: `./subdir/HIVES.md` (one level deep)

### Example HIVES.md

```markdown
# Project Context for My App

## Project Overview
This is a Node.js REST API built with Express.js.

## Coding Guidelines
- Use async/await, not callbacks
- Follow ESLint rules
- Write tests for all endpoints

## Architecture
- API routes in `src/routes/`
- Business logic in `src/services/`
- Database models in `src/models/`

## Important Notes
- Always validate user input
- Use JWT for authentication

## Custom Instructions
When suggesting code changes, prioritize security and performance.
```

### Managing Context

```bash
# Show loaded context
You > /memory show

# Reload context files
You > /memory refresh

# Add custom memory (persisted globally)
You > /memory add "Use TypeScript strict mode"

# List context file locations
You > /memory list
```

### Include Other Files

You can include other markdown files in your HIVES.md:

```markdown
# Main Context

@docs/architecture.md
@docs/api-guidelines.md
```

## 🔧 Custom Commands

Automate workflows with TOML-based custom commands:

### Create Example Commands

```bash
You > /examples global
✓ Created example commands in: ~/.hives-cli/commands/

Example commands:
  /commit - Generate commit message
  /review - Code review assistant
  /docs - Generate documentation
  /gitstatus - Git status summary
  /git:commit - Git commit helper (namespaced)
```

### Command File Format

Create `.toml` files in:
- `~/.hives-cli/commands/` (global commands)
- `.hives/commands/` (project-specific commands)

Example: `~/.hives-cli/commands/commit.toml`

```toml
# Git Commit Message Generator
description = "Generate a git commit message based on changes"
prompt = """
Generate a concise git commit message for the following changes:

{{args}}

Follow conventional commits format (feat:, fix:, docs:, etc.)
"""
```

### Command Features

**Arguments**: Use `{{args}}` placeholder

```toml
prompt = "Explain this code: {{args}}"
```

**Shell Injection**: Use `!{command}` syntax

```toml
prompt = """
Current git status:
!{git status --short}

Please summarize the changes.
"""
```

**Namespacing**: Organize commands in subdirectories

```
commands/
├── commit.toml         -> /commit
├── review.toml         -> /review
└── git/
    └── diff.toml       -> /git:diff
```

### Using Custom Commands

```bash
# List available commands
You > /commands

# Use a command
You > /commit

# Use command with arguments
You > /review @src/app.js

# Use namespaced command
You > /git:commit
```

## ⚙️ Settings System

Configure Modern CLI with hierarchical settings:

### View Settings

```bash
You > /settings
# or
You > /settings show
```

### Create Settings File

```bash
# Global settings (applies to all projects)
You > /settings create global

# Project settings (applies to current project)
You > /settings create project
```

### Settings File Locations

- **Global**: `~/.hives-cli/settings.json`
- **Project**: `.hives/settings.json`

Project settings override global settings.

### Available Settings

```json
{
  "general": {
    "model": "claude-3-5-sonnet-latest",
    "stream": true,
    "yoloMode": false,
    "contextFiles": true,
    "customCommands": true
  },
  "ui": {
    "theme": "default",
    "showBanner": true,
    "markdown": true,
    "syntaxHighlight": true,
    "showTips": true
  },
  "session": {
    "autoSave": false,
    "autoLoad": false,
    "maxSessions": 50,
    "exportFormat": "markdown"
  },
  "context": {
    "loadGlobal": true,
    "loadProject": true,
    "loadSubdirectories": true,
    "maxContextSize": 100000
  },
  "tools": {
    "webFetch": true,
    "shellExecution": false,
    "fileOperations": true
  },
  "advanced": {
    "apiBase": "https://api.polza.ai/v1",
    "timeout": 30000,
    "maxRetries": 3,
    "debug": false
  }
}
```

### Manage Settings

```bash
# Set a value
You > /settings set ui.theme dark global

# Reset to defaults
You > /settings reset global

# Export settings
You > /settings export my-settings.json

# Import settings
You > /settings import my-settings.json global
```

## 📊 Statistics & Utilities

### Conversation Statistics

```bash
You > /stats

📊 Conversation Statistics:

  Total Messages:           24
  User Messages:            12
  Assistant Messages:       12
  Total Characters:         45,623
  Estimated Tokens:         11,405
```

### Copy to Clipboard

```bash
# Copy the last AI response to clipboard
You > /copy
✓ Last response copied to clipboard
```

### Web Fetch

```bash
# Fetch content from a URL (for use in prompts or standalone)
You > /fetch https://example.com

🌐 Fetching: https://example.com

✓ Status: 200
  Content-Type: text/html; charset=utf-8
  Content-Length: 1256 bytes
```

### Export Sessions

```bash
# Export to Markdown (default)
You > /export markdown conversation.md

# Export to JSON
You > /export json conversation.json
```

## 🎯 Available Models

Hives Modern CLI supports various AI models through Polza AI:

| Provider | Model ID | Description |
|----------|----------|-------------|
| Anthropic | `anthropic/claude-sonnet-4.5` | Claude Sonnet 4.5 (default) |
| Anthropic | `anthropic/claude-3-5-sonnet` | Claude 3.5 Sonnet |
| OpenAI | `openai/gpt-4o` | GPT-4 Optimized |
| OpenAI | `openai/o1-preview` | O1 with reasoning |
| OpenAI | `openai/gpt-4o-mini` | GPT-4 Mini (cost-effective) |
| DeepSeek | `deepseek/deepseek-r1` | DeepSeek R1 |
| Google | `google/gemini-pro` | Google Gemini Pro |

Change models:

```bash
# Command-line flag
node src/index.js -m "openai/gpt-4o"

# Or in interactive mode
You > /model openai/gpt-4o
```

## 🏗️ Architecture

```
modern-cli/
├── src/
│   ├── index.js              # Main entry point
│   ├── interactive.js        # Interactive mode
│   ├── non-interactive.js    # Non-interactive mode
│   ├── lib/
│   │   ├── polza-client.js   # Polza AI API client
│   │   └── tools.js          # Tool definitions & handlers
│   ├── ui/
│   │   ├── banner.js         # Welcome banner
│   │   └── markdown.js       # Markdown rendering
│   ├── utils/
│   │   ├── version.js        # Version utilities
│   │   └── prompt-processor.js # @file and !shell processor
│   └── commands/
│       └── index.js          # Slash command handlers
├── package.json
└── README.md
```

## 🎨 Theme System

Modern CLI includes 7 built-in color themes and support for custom themes.

### Available Themes

- **default** - Modern CLI default with vibrant colors
- **dark** - Dark theme with muted colors
- **light** - Light theme for light backgrounds
- **solarized** - Solarized dark with balanced contrast
- **monokai** - Monokai with vibrant syntax colors
- **gruvbox** - Gruvbox with warm retro colors
- **minimal** - Minimal monochrome theme

### Using Themes

```bash
# List available themes
/theme list

# Preview a theme
/theme preview solarized

# Switch to a theme
/theme monokai
```

Themes are saved in your settings and persist across sessions.

### Custom Themes

Define custom themes in `~/.hives-cli/settings.json`:

```json
{
  "theme": "my-theme",
  "customThemes": {
    "my-theme": {
      "name": "My Custom Theme",
      "description": "A custom theme",
      "colors": {
        "banner": "#FF6B6B",
        "userPrompt": "#4ECDC4",
        "assistantPrompt": "#95E1D3",
        "success": "#50FA7B",
        "error": "#FF5555"
      }
    }
  }
}
```

## 💾 Checkpointing System

Git-based checkpoint system for safely undoing AI file modifications.

### How It Works

1. Before AI modifies files, a checkpoint is automatically created
2. Files are saved to a shadow Git repository in `~/.hives-cli/history/`
3. Conversation snapshots are saved with each checkpoint
4. Restore files from any previous checkpoint

### Using Checkpoints

```bash
# Enable checkpointing
/checkpoint enable

# List all checkpoints
/checkpoint list

# Show checkpoint details
/checkpoint show cp_1234567890_abc123

# Restore from checkpoint
/restore cp_1234567890_abc123

# Clean old checkpoints (older than 30 days)
/checkpoint clean 30

# Show checkpoint statistics
/checkpoint stats
```

### Configuration

Enable in settings (`~/.hives-cli/settings.json`):

```json
{
  "checkpointing": {
    "enabled": true
  }
}
```

## 🔌 MCP Protocol Support

Modern CLI supports the Model Context Protocol (MCP) for extending functionality with external servers.

### Configuring MCP Servers

Add servers to your settings file:

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["/path/to/mcp-server.js"],
        "env": {
          "API_KEY": "your-api-key"
        },
        "enabled": true
      }
    }
  }
}
```

### Managing MCP Servers

```bash
# List configured servers
/mcp list

# List available tools
/mcp tools

# Show tool descriptions
/mcp desc

# Show tool schema
/mcp schema server:tool_name

# Start a server
/mcp start my-server

# Stop a server
/mcp stop my-server

# Restart all servers
/mcp refresh

# Show MCP statistics
/mcp stats
```

## ⌨️ Vim Mode

Full vim keybindings for power users who prefer modal editing.

### Enabling Vim Mode

```bash
# Toggle vim mode
/vim
```

Or enable permanently in settings:

```json
{
  "vimMode": {
    "enabled": true
  }
}
```

### Supported Commands

**NORMAL Mode** (press ESC to enter):
- Movement: `h` `j` `k` `l` `w` `b` `e` `0` `$`
- Insert: `i` `a` `A` `I`
- Delete: `x` `X` `d` `dd` `dw` `D`
- Change: `c` `cc` `cw` `C`
- Yank/Paste: `y` `yy` `p` `P`
- Replace: `r`

**INSERT Mode** (default):
- Press `i` in NORMAL mode to enter
- All normal typing works
- Press ESC to return to NORMAL mode

The mode indicator shows current mode: `[NORMAL]` or `[INSERT]`

## 🎓 Design Philosophy

Hives Modern CLI is inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) and follows these principles:

1. **Beautiful UX** - Terminal should be a joy to use
2. **Powerful Features** - Advanced capabilities when you need them
3. **Simple Architecture** - Clean, maintainable code
4. **Developer-First** - Built for developers who live in the terminal
5. **Polza-Powered** - Uses Polza AI's multi-provider platform

## 📊 Comparison with Gemini CLI

| Feature | Hives Modern CLI | Gemini CLI |
|---------|------------------|------------|
| Runtime | Node.js | Node.js |
| UI Framework | Readline + Chalk | React/Ink |
| AI Provider | Polza AI (multi-provider) | Google Gemini |
| File Inclusion | ✅ `@file` | ✅ |
| Shell Execution | ✅ `!command` | ✅ |
| Markdown Rendering | ✅ | ✅ |
| YOLO Mode | ✅ | ✅ |
| JSON Output | ✅ | ✅ |
| Context Files (HIVES.md) | ✅ | ✅ |
| Custom Commands (TOML) | ✅ | ✅ |
| Settings System | ✅ | ✅ |
| Web Fetch Tool | ✅ | ✅ |
| Session Export | ✅ | ✅ |
| **Theme System** | ✅ 7 themes | ✅ |
| **Checkpointing** | ✅ Git-based | ✅ |
| **MCP Protocol** | ✅ Full support | ✅ |
| **Vim Mode** | ✅ Full vim keybindings | ✅ |
| **Feature Parity** | **100%** | **100%** |
| Complexity | Simple | Advanced |

## 🔒 Security Considerations

- The CLI has file system access
- **YOLO Mode** bypasses shell command confirmations - use carefully
- Never commit your API key to version control
- Use environment variables for sensitive configuration

## 🐛 Troubleshooting

### "Polza API key is required" Error

**Solution**: Set the `POLZA_API_KEY` environment variable:

```bash
export POLZA_API_KEY=ak_your_key_here
```

### Shell Commands Not Working

**Problem**: `!command` not executing

**Solution**: Enable YOLO mode:

```bash
node src/index.js --yolo
```

Or in interactive mode:

```
You > /yolo
```

### File Not Found with `@file`

**Solutions**:
- Use absolute paths: `@/full/path/to/file.js`
- Use relative paths: `@./src/file.js`
- Quote paths with spaces: `@"path with spaces/file.js"`

## 🤝 Contributing

Contributions are welcome! This project is part of the Hives ecosystem.

## 📄 License

This project is released into the public domain under the [Unlicense](../LICENSE).

## 🙏 Acknowledgments

- Inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) from Google
- Powered by [Polza AI](https://polza.ai)
- Uses logic and patterns from [polza-cli](../polza-cli/)
- Part of the [Hives](https://github.com/judas-priest/hives) ecosystem

## 📚 Resources

- [Polza AI Official Website](https://polza.ai)
- [Polza AI Documentation](https://docs.polza.ai)
- [Gemini CLI (inspiration)](https://github.com/google-gemini/gemini-cli)
- [Hives Repository](https://github.com/judas-priest/hives)

---

**Built with ❤️ for developers who love the terminal**
