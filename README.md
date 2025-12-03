# Hives

[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

**Modern command-line interfaces powered by AI.**

Hives is a collection of AI-powered CLI tools designed for developers. Choose the CLI that best fits your workflow:

## 📦 Available CLI Tools

### 🆕 [Modern CLI](./modern-cli/) - **Recommended**

A completely new, modern CLI client inspired by Gemini CLI:

- **🎨 Beautiful UI**: Gradient banners, colored output, markdown rendering
- **🤖 Multi-Provider**: Claude, GPT-4, Gemini, and more via Polza AI
- **🔧 Powerful Tools**: File operations, shell execution, glob patterns
- **📝 File Inclusion**: Use `@file.js` syntax
- **🚀 Shell Commands**: Execute with `!ls -la` (YOLO mode)
- **⚡ Simple Architecture**: Lightweight, fast, easy to understand
- **💬 Interactive & Non-Interactive**: Perfect for both chat and scripting

[Read Modern CLI Documentation →](./modern-cli/README.md)

### 🔹 [Polza CLI](./polza-cli/)

Enhanced CLI with TUI support:

- **🎯 Traditional CLI**: Readline-based interface
- **🧠 AI-Powered**: Leverages Polza AI
- **🔧 Built-in Tools**: File operations, shell commands, grep, glob patterns
- **🔌 Extensible**: Custom commands and persistent memory
- **📝 Markdown Support**: Beautiful terminal markdown rendering
- **⌨️ Smart Completion**: Tab completion and fuzzy matching

[Read Polza CLI Documentation →](./polza-cli/README.md)

### 🔹 [Hives Wrapper](./hives.js)

Simple wrapper around polza-cli for quick access:

- **🚀 Quick Start**: Just run `node hives.js`
- **🎨 Branded**: Custom Hives banner
- **🔄 Passthrough**: All polza-cli features

## 🚀 Why Hives?

- **🎯 Modern Interface**: Clean, user-friendly CLIs inspired by Gemini CLI's design
- **🧠 AI-Powered**: Leverages Polza AI for intelligent conversations and assistance
- **🔧 Built-in Tools**: File operations, shell commands, grep, glob patterns
- **💻 Terminal-First**: Designed for developers who live in the command line
- **🔌 Extensible**: Custom commands and persistent memory
- **📝 Markdown Support**: Beautiful terminal markdown rendering
- **⚡ Choice**: Pick the CLI that fits your workflow

## 📦 Quick Start

### Prerequisites

- Node.js version 18 or higher
- Polza AI API key (get one at [polza.ai](https://polza.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/judas-priest/hives.git
cd hives

# Set your API key
export POLZA_API_KEY=ak_your_key_here
```

### Try Modern CLI (Recommended)

```bash
# Install dependencies
cd modern-cli && npm install

# Run it!
node src/index.js

# Or non-interactive
node src/index.js -p "Explain async/await in JavaScript"
```

### Try Polza CLI

```bash
# Install dependencies
cd polza-cli && npm install

# Run it!
node cli/index.js
```

### Try Hives Wrapper

```bash
# Install polza-cli dependencies first
cd polza-cli && npm install && cd ..

# Run Hives wrapper
node hives.js
```

## 🔐 Configuration

### Set Your API Key

Hives CLI uses Polza AI as its backend. You need to set your API key:

```bash
export POLZA_API_KEY=ak_your_key_here
```

To make this permanent, add it to your shell configuration:

```bash
# For bash
echo 'export POLZA_API_KEY=ak_your_key_here' >> ~/.bashrc

# For zsh
echo 'export POLZA_API_KEY=ak_your_key_here' >> ~/.zshrc
```

## 💡 Usage

### Interactive Mode

Simply run `hives` to start an interactive chat session:

```bash
hives
```

You'll see a beautiful welcome banner and an interactive prompt where you can:
- Chat with the AI
- Include files in your prompts using `@filename` syntax
- Execute shell commands with `!command` (YOLO mode required)
- Use built-in commands starting with `/`

### Non-Interactive Mode

Pass a prompt directly as an argument:

```bash
hives -p "Explain how async/await works in JavaScript"
```

### Command-Line Options

```bash
hives [options]

Options:
  -p, --prompt <text>           Send a single prompt (non-interactive)
  -m, --model <model>          Choose AI model
  --yolo, --yolomode           Enable YOLO mode (auto-execute commands)
  --help                       Display help information
  --version                    Display version information
```

## 📋 Built-in Commands

Hives CLI comes with powerful built-in commands:

### General Commands
- `/help` - Show help information
- `/version` - Display version and feature information
- `/exit` - Exit the CLI

### File Operations
- `@file.js` - Include file contents in your prompt
- `@src/` - Include directory contents

### Shell Commands
- `!ls -la` - Execute shell commands (requires YOLO mode)
- `!{pwd}` - Alternative syntax for shell execution

### Memory & Settings
- `/memory` - Manage persistent memory
- `/settings` - Configure CLI preferences
- `/clear` - Clear conversation history

### Sessions
- `/save` - Save current session
- `/restore` - Restore a previous session
- `/history` - View command history

### Advanced
- `/tools` - List available tools
- `/init` - Initialize HIVES.md configuration file

## 🎨 Features

### File Inclusion

Include file contents directly in your prompts:

```
You > Explain this code: @src/main.js
```

### Shell Execution

Execute shell commands within prompts (requires `--yolo` flag):

```
You > Show me the current directory: !pwd
You > List files: !ls -la
```

### Custom Instructions (HIVES.md)

Create a `HIVES.md` file in your project root to define project-specific instructions:

```markdown
# Project Instructions
- Use TypeScript for all new files
- Follow functional programming patterns
- Add JSDoc comments for public functions
```

The CLI automatically loads these instructions on startup.

### Tab Completion

Press TAB while typing for intelligent completions:
- Command completion: `/hel` + TAB → `/help`
- File completion: `@READ` + TAB → suggests matching files
- Fuzzy matching for better suggestions

### Markdown Rendering

Responses are beautifully rendered in your terminal with:
- Syntax highlighting for code blocks
- Formatted lists and tables
- Colored headings and emphasis

## 🏗️ Architecture

The Hives project contains multiple CLI implementations, each with different focuses:

### Modern CLI (New!)

Clean, simple architecture inspired by Gemini CLI:

```
modern-cli/
├── src/
│   ├── index.js              # Main entry point
│   ├── interactive.js        # Interactive mode
│   ├── non-interactive.js    # Non-interactive mode
│   ├── lib/
│   │   ├── polza-client.js   # Polza AI API client
│   │   └── tools.js          # Tool definitions
│   ├── ui/
│   │   ├── banner.js         # Welcome banner
│   │   └── markdown.js       # Markdown rendering
│   ├── utils/                # Utilities
│   └── commands/             # Slash commands
└── package.json
```

### Polza CLI

Powerful CLI framework with advanced features:

```
polza-cli/
├── cli/                      # CLI interface
├── shared/
│   ├── lib/                  # Core libraries
│   │   ├── polza-client.js   # AI integration
│   │   ├── history-manager.js
│   │   ├── memory-manager.js
│   │   └── ...
│   └── tools/                # File system and advanced tools
└── commands/                 # Custom TOML commands
```

### Repository Structure

```
hives/
├── modern-cli/            # Modern CLI (recommended)
├── polza-cli/             # Polza CLI framework
├── hives.js               # Simple wrapper
├── gemini-cli/            # Reference implementation
└── hive-mind2/            # AI orchestration system
```

## 🔗 Related Projects

This repository contains multiple complementary projects:

- **[polza-cli](./polza-cli/)** - The underlying CLI framework
- **[hive-mind2](./hive-mind2/)** - AI orchestration and automation system
- **[gemini-cli](./gemini-cli/)** - Reference implementation from Google

## 🤝 Contributing

Contributions are welcome! This project follows the Unlicense, making it public domain software.

### Development

```bash
# Clone the repository
git clone https://github.com/judas-priest/hives.git
cd hives

# Install dependencies
cd polza-cli && npm install && cd ..

# Run in development mode
node hives.js --help
```

## 📄 License

This project is released into the public domain under the [Unlicense](LICENSE).

## 🙏 Acknowledgments

- Inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) from Google
- Built with [Polza AI](https://polza.ai)
- Part of the Hives ecosystem

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [polza-cli README](./polza-cli/README.md) for detailed documentation
2. Open an issue on GitHub
3. Refer to the [Gemini CLI documentation](./gemini-cli/README.md) for inspiration

---

**Made with ❤️ by the Hives community**
