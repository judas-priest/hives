# Polza CLI - TUI Mode

The Polza CLI provides a rich interactive terminal user interface (TUI) using standard Node.js features without heavyweight dependencies like Ink or React.

## 🎨 What's Different from Traditional TUI

Instead of using complex frameworks that can cause dependency issues (like Ink/yoga-layout), Polza CLI provides an excellent interactive experience using:

- **readline** for input handling with autocomplete
- **ANSI codes** for colors and formatting
- **marked-terminal** for beautiful markdown rendering
- **Native Node.js** features for maximum compatibility

This approach ensures:
- ✅ **No module resolution issues**
- ✅ **Faster startup time**
- ✅ **Smaller dependencies**
- ✅ **Better compatibility across environments**

## ✨ Features

**Interactive Interface:**
- 🎨 **Beautiful CLI** - Colored output, formatted text, and visual feedback
- 💬 **Chat Mode** - Interactive conversation with AI
- 📋 **Tab Completion** - Autocomplete for commands and file paths
- 📝 **Markdown Rendering** - Beautiful markdown display in the terminal
- ⌨️ **Command Preview** - Live preview of commands and files as you type
- 🎯 **Fuzzy Matching** - Smart command suggestions (zsh-style)

**Core Features:**
- ✅ **Polza AI Integration** - Powerful AI capabilities
- ✅ **File Inclusion** - `@file.js` syntax to include file contents
- ✅ **Shell Execution** - `!command` with YOLO mode for auto-approval
- ✅ **Custom Commands** - TOML-based custom commands from `.polza/commands/`
- ✅ **Memory Management** - Persistent memory across sessions
- ✅ **Settings** - Configurable preferences
- ✅ **Tools** - File system and advanced tools with function calling
- ✅ **POLZA.md** - Custom instructions support

**Advanced UX:**
- 🔍 **File Preview** - See file contents as you type `@filename`
- 📜 **Command Preview** - View command descriptions inline
- 🔄 **Session Management** - Save and restore conversations
- 📊 **Usage Tracking** - Token and cost information
- 🎮 **Keyboard Shortcuts** - Ctrl+C to exit, Ctrl+L to clear
- 🎯 **Smart Detection** - Automatic syntax processing for special commands

## 🚀 Installation & Usage

### Install Dependencies

```bash
npm install
```

### Run the Interactive TUI

```bash
# Using npm script
npm start

# Or using the tui script (same as above)
npm run tui

# Or directly
node cli/index.js

# Or using the bin command (after linking/installing)
polza-cli

# Or use the tui alias
polza-tui
```

### Run with Options

```bash
# With YOLO mode (auto-approve shell commands)
polza-cli --yolo

# With specific model
polza-cli -m "openai/gpt-4o"

# Non-interactive mode (single prompt)
polza-cli -p "Explain @README.md"

# Interactive mode with initial prompt
polza-cli -i "Show me the project structure"

# Combined
polza-cli --yolo -m "anthropic/claude-sonnet-4.5"
```

## 📖 How to Use

### Basic Chat

1. Start the CLI:
   ```bash
   polza-cli
   ```

2. Type your message at the prompt:
   ```
   You > Hello, can you help me with some code?
   ```

3. Press Enter to send

4. The AI response appears immediately with markdown formatting

### Using Commands

Type commands directly at the prompt:

- `/help` - Show all available commands
- `/tools` - List available tools
- `/memory` - Manage persistent memory
- `/settings` - View/modify settings
- `/clear` - Clear conversation history
- `/history` - Show conversation history
- `/save` - Save current session
- `/load <id>` - Load a saved session
- `/markdown` - Toggle markdown rendering
- `/yolo` - Toggle YOLO mode (shell execution)
- `/init` - Create a POLZA.md file
- `/exit` - Save and exit

### File Inclusion

Include file contents in your prompts:

```
You > Can you explain this code? @src/index.js
```

Multiple files:

```
You > Compare these two implementations: @old.js @new.js
```

Include directories:

```
You > What files are in this directory? @src/
```

### Shell Commands (YOLO Mode)

When YOLO mode is enabled (use `--yolo` flag or `/yolo` command):

```
You > What's in the current directory? !ls -la
```

Alternative syntax:

```
You > What's my current path? !{pwd}
```

### Custom Commands

Create custom commands in `.polza/commands/*.toml`:

```toml
name = "review"
description = "Review code for best practices"
prompt = "Review the following code for best practices, security issues, and improvements:\n\n{args}"
```

Use them:

```
You > /review @src/index.js
```

### Tab Completion

Press TAB while typing:

- Commands: `/h` + TAB → `/help`
- Files: `@src/in` + TAB → `@src/index.js`
- Custom commands: `/rev` + TAB → `/review`

### Live Previews

As you type, you'll see:

- **Command preview**: When typing `/help`, shows command description
- **File preview**: When typing `@file.js`, shows first few lines of the file
- **Fuzzy suggestions**: Similar to zsh-autosuggestions

## 🔧 Configuration

### Environment Variables

```bash
# Required: Your Polza API key
export POLZA_API_KEY=ak_your_key_here

# Optional: Default model
export POLZA_MODEL="openai/gpt-4o"
```

### Settings

Use `/settings` command to view and modify settings:

```bash
# View all settings
/settings

# Set a specific setting
/settings set model "anthropic/claude-sonnet-4.5"

# Get a setting value
/settings get model

# Reset to defaults
/settings reset
```

### POLZA.md Custom Instructions

Create a `POLZA.md` file in your project:

```bash
/init
```

Edit the file to add custom instructions that will be included in every conversation.

The loader checks these locations (in order):
1. `./POLZA.md` (current directory - most specific)
2. `../POLZA.md`, `../../POLZA.md`, etc. (parent directories)
3. `~/.polza-cli/POLZA.md` (user-level)
4. `~/.config/polza-cli/POLZA.md` (global)

## 🎮 Keyboard Shortcuts

- `Ctrl+C` - Exit the CLI
- `Ctrl+L` - Clear the screen (terminal built-in)
- `TAB` - Autocomplete commands and files
- `Up/Down` - Navigate command history
- `Ctrl+R` - Reverse search history (terminal built-in)

## 📝 Session Management

### Save a Session

```bash
/save
```

Sessions are automatically saved when you exit with `/exit`.

### List Sessions

```bash
/sessions
```

### Load a Session

```bash
/load session-2024-01-15-1234
```

Or use the restore command:

```bash
/restore session-2024-01-15-1234
```

## 💾 Memory Management

Persistent memory across sessions:

```bash
# Set a memory
/memory set project-name "My Awesome Project"

# Get a memory
/memory get project-name

# List all memories
/memory list

# Search memories
/memory search "project"

# Delete a memory
/memory delete project-name

# Clear all memories
/memory clear

# Show POLZA.md custom instructions
/memory show

# Reload POLZA.md files
/memory refresh
```

## 🛠️ Troubleshooting

### API Key Not Found

```
Error: POLZA_API_KEY environment variable is not set
```

Solution:
```bash
export POLZA_API_KEY=ak_your_key_here
```

### Autocomplete Not Working

Make sure you're using a modern terminal that supports readline features. Most terminals (bash, zsh, etc.) support this out of the box.

## 🆚 Why Not Ink/React?

The previous TUI implementation used Ink (React for CLIs) which introduced several problems:

1. **Module Resolution Issues**: Complex dependency chains (ink → yoga-layout) caused "Cannot find module" errors even after installation
2. **Bundle Size**: Large dependency tree with React and Yoga layout engine
3. **Performance**: Slower startup due to heavier runtime
4. **Compatibility**: Issues across different Node.js versions and package managers (npm, bun, yarn)

The current approach using native Node.js readline and ANSI codes provides:

- ✅ **Zero module resolution issues**
- ✅ **Instant startup**
- ✅ **Minimal dependencies**
- ✅ **Works everywhere Node.js works**
- ✅ **Same great features, better reliability**

## 📚 More Information

For more details on the CLI architecture and features, see the main [README.md](./README.md).
