# Hives Modern CLI

[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](../LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

**A modern, beautiful command-line interface inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli), powered by Polza AI.**

Hives Modern CLI brings AI-powered assistance directly into your terminal with a clean, intuitive interface and powerful features for developers.

## ✨ Features

- 🎨 **Beautiful Terminal UI** - Gradient banners, colored output, and markdown rendering
- 🤖 **AI-Powered** - Chat with Claude, GPT-4, and other models via Polza AI
- 🔧 **Built-in Tools** - File operations, shell commands, glob patterns
- 📝 **File Inclusion** - Use `@file.js` syntax to include files in prompts
- 🚀 **Shell Execution** - Run shell commands with `!ls -la` (YOLO mode)
- 💬 **Interactive & Non-Interactive** - Use in chat mode or for quick queries
- 🎯 **Multiple Output Formats** - Text, JSON, or streaming JSON
- ⌨️ **Slash Commands** - Quick access to features with `/help`, `/model`, etc.

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

| Command | Description |
|---------|-------------|
| `/help` | Show help and available commands |
| `/exit` | Exit the CLI |
| `/clear` | Clear the screen |
| `/history` | Show conversation history |
| `/version` | Show version information |
| `/model [name]` | Change or show current AI model |
| `/yolo` | Toggle YOLO mode on/off |
| `/tools` | List available tools |

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

### Shell Execution (`!command`)

Execute shell commands within prompts (requires `--yolo` mode):

```
You > Show current directory: !pwd

You > List files: !ls -la

You > Git status: !{git status}
```

**Safety Note**: Shell commands require YOLO mode (`--yolo` flag). Use with caution!

## 🔧 Available Tools

The AI can automatically use these tools:

### File System Tools

- `read_file` - Read file contents
- `write_file` - Create or modify files
- `list_directory` - List directory contents
- `glob_files` - Find files matching patterns
- `file_exists` - Check if file/directory exists

### Advanced Tools

- `execute_shell` - Run shell commands (YOLO mode only)

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
