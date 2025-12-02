#!/usr/bin/env node

/**
 * Polza CLI - Enhanced with gemini-cli features
 * A CLI client with chat support, file system access, and advanced features
 */

import readline from 'readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PolzaClient } from './lib/polza-client.js';
import { fileSystemTools, executeFileSystemTool } from './tools/filesystem.js';
import { advancedTools, executeAdvancedTool } from './tools/advanced.js';
import { HistoryManager } from './lib/history-manager.js';
import { renderMarkdown, hasMarkdown } from './lib/markdown-renderer.js';
import { processPrompt, hasSpecialSyntax } from './lib/prompt-processor.js';
import { CommandLoader, parseCustomCommand } from './lib/command-loader.js';
import { MemoryManager } from './lib/memory-manager.js';
import { SettingsManager } from './lib/settings-manager.js';
import { createCompleter, updateCompleter, showFilePreview, showCommandPreview } from './lib/autocomplete.js';
import { PolzaMdLoader, createDefaultPolzaMd } from './lib/polza-md-loader.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

class PolzaCLI {
  constructor(options = {}) {
    this.conversationHistory = [];
    this.client = null;
    this.rl = null;
    this.historyManager = new HistoryManager();
    this.commandLoader = new CommandLoader();
    this.memoryManager = new MemoryManager();
    this.settingsManager = new SettingsManager();
    this.polzaMdLoader = new PolzaMdLoader();

    // Options from command line
    this.yolomode = options.yolomode || options.yolo || false;
    this.promptMode = options.prompt || null;
    this.interactiveMode = options.promptInteractive || null;
    this.model = options.model || null;
    this.outputFormat = options.outputFormat || 'text';
    this.markdownEnabled = true;
    this.customInstructions = '';
  }

  /**
   * Initialize the CLI
   */
  async initialize() {
    try {
      // Initialize all managers
      await this.memoryManager.initialize();
      await this.settingsManager.initialize();

      // Load custom commands
      await this.commandLoader.loadCommands();

      // Load POLZA.md custom instructions
      this.customInstructions = await this.polzaMdLoader.load();

      // Apply settings
      const savedModel = this.settingsManager.get('model');
      this.markdownEnabled = this.settingsManager.get('markdownEnabled');

      // Initialize Polza client
      this.client = new PolzaClient({
        model: this.model || savedModel
      });

      return true;
    } catch (error) {
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
      console.error(`\n${colors.yellow}Setup Instructions:${colors.reset}`);
      console.error(`1. Get your API key from https://polza.ai`);
      console.error(`2. Set the environment variable: export POLZA_API_KEY=ak_your_key_here`);
      console.error(`3. Run the CLI again\n`);
      return false;
    }
  }

  /**
   * Fuzzy match a command to the closest built-in command
   */
  async fuzzyMatchCommand(inputCmd) {
    const builtInCommands = [
      '/help', '/version', '/tools', '/memory', '/settings', 
      '/restore', '/clear', '/history', '/sessions', '/save', 
      '/load', '/markdown', '/yolo', '/init', '/exit'
    ];

    // Import fuzzyScore function
    const { fuzzyScore } = await import('./lib/autocomplete.js');

    // Find best match
    let bestMatch = null;
    let bestScore = 0;

    for (const cmd of builtInCommands) {
      const score = fuzzyScore(inputCmd, cmd);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = cmd;
      }
    }

    // Only return fuzzy match if score is reasonable (not too low)
    return bestScore >= 50 ? bestMatch : inputCmd;
  }

  /**
   * Show welcome banner
   */
  showBanner() {
    console.log(`${colors.bright}${colors.green}Polza CLI${colors.reset} ${colors.dim}(Enhanced Edition)${colors.reset}`);
    console.log(`${colors.dim}Chat with AI, access files, run commands, and more${colors.reset}\n`);
    console.log(`${colors.yellow}Model:${colors.reset} ${this.client.model}`);
    console.log(`${colors.yellow}Session ID:${colors.reset} ${this.historyManager.getSessionId()}`);
    console.log(`${colors.yellow}YOLO Mode:${colors.reset} ${this.yolomode ? colors.green + 'ENABLED' : colors.red + 'DISABLED'}${colors.reset}`);
    console.log(`${colors.yellow}Config Dir:${colors.reset} ${this.historyManager.getConfigDir()}`);

    const customCommands = this.commandLoader.getAllCommands();
    if (customCommands.length > 0) {
      console.log(`${colors.yellow}Custom Commands:${colors.reset} ${customCommands.length} loaded`);
    }

    // Show POLZA.md info
    if (this.polzaMdLoader.hasInstructions()) {
      const loadedFiles = this.polzaMdLoader.getLoadedFiles();
      console.log(`${colors.yellow}Custom Instructions:${colors.reset} ${loadedFiles.length} POLZA.md file(s) loaded`);
    }

    console.log(`\n${colors.yellow}Built-in Commands:${colors.reset}`);
    console.log(`  ${colors.dim}/help${colors.reset}      - Show available commands`);
    console.log(`  ${colors.dim}/version${colors.reset}   - Show version information`);
    console.log(`  ${colors.dim}/tools${colors.reset}     - List available tools`);
    console.log(`  ${colors.dim}/memory${colors.reset}    - Manage persistent memory`);
    console.log(`  ${colors.dim}/settings${colors.reset}  - View/modify settings`);
    console.log(`  ${colors.dim}/restore${colors.reset}   - Restore a saved session`);
    console.log(`  ${colors.dim}/clear${colors.reset}     - Clear conversation history`);
    console.log(`  ${colors.dim}/exit${colors.reset}      - Exit the CLI\n`);

    console.log(`${colors.yellow}Special Syntax:${colors.reset}`);
    console.log(`  ${colors.dim}@file.js${colors.reset}   - Include file content in prompt`);
    console.log(`  ${colors.dim}@src/${colors.reset}      - Include directory listing`);
    if (this.yolomode) {
      console.log(`  ${colors.dim}!ls -la${colors.reset}   - Execute shell command in prompt`);
      console.log(`  ${colors.dim}!{command}${colors.reset} - Execute shell command (alt syntax)`);
    }
    console.log(`\n${colors.yellow}Autocompletion:${colors.reset}`);
    console.log(`  ${colors.dim}Press TAB${colors.reset}  - Autocomplete commands and file paths`);
    console.log();
  }

  /**
   * Start the CLI
   */
  async start() {
    if (!(await this.initialize())) {
      process.exit(1);
    }

    // Handle non-interactive prompt mode
    if (this.promptMode) {
      await this.handleNonInteractivePrompt(this.promptMode);
      return;
    }

    // Show welcome banner
    this.showBanner();

    // Handle interactive mode with initial prompt
    if (this.interactiveMode) {
      await this.processMessage(this.interactiveMode);
    }

    // Create readline interface with autocomplete
    const customCommandNames = this.commandLoader.getAllCommands().map(cmd => cmd.name);
    const completer = createCompleter(customCommandNames);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${colors.cyan}You${colors.reset} > `,
      completer: completer,
      terminal: true
    });

    this.rl.prompt();

    // Add keypress handler for live preview (like gemini-cli)
    // Uses debouncing to avoid excessive updates
    let previewTimeout = null;
    this.rl.input.on('keypress', (str, key) => {
      // Clear any pending preview timeout
      if (previewTimeout) {
        clearTimeout(previewTimeout);
      }

      // Debounce preview updates to avoid excessive rendering
      previewTimeout = setTimeout(() => {
        const currentLine = this.rl.line;

        // Show file preview for @ references
        if (currentLine.includes('@')) {
          showFilePreview(currentLine, this.rl);
        }
        // Show command preview for / commands
        else if (currentLine.startsWith('/')) {
          showCommandPreview(currentLine, this.rl);
        }
      }, 100); // 100ms debounce
    });

    this.rl.on('line', async (input) => {
      const trimmedInput = input.trim();

      // Clear any pending preview when line is submitted
      if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
      }

      if (!trimmedInput) {
        this.rl.prompt();
        return;
      }

      // Handle commands
      if (trimmedInput.startsWith('/')) {
        await this.handleCommand(trimmedInput);
        this.rl.prompt();
        return;
      }

      // Process user message
      await this.processMessage(trimmedInput);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(`\n${colors.dim}Goodbye!${colors.reset}`);
      process.exit(0);
    });
  }

  /**
   * Handle non-interactive prompt mode
   */
  async handleNonInteractivePrompt(prompt) {
    try {
      await this.processMessage(prompt);
      process.exit(0);
    } catch (error) {
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle special commands
   */
  async handleCommand(command) {
    const parts = command.toLowerCase().split(' ');
    let cmd = parts[0];
    const args = parts.slice(1).join(' ');

    // Try fuzzy matching for built-in commands
    cmd = await this.fuzzyMatchCommand(cmd);

    // Check if it's a custom command
    const customCmd = parseCustomCommand(command);
    if (customCmd && this.commandLoader.hasCommand(customCmd.commandName)) {
      await this.handleCustomCommand(customCmd.commandName, customCmd.args);
      return;
    }

    // Built-in commands
    switch (cmd) {
      case '/help':
        this.showHelp();
        break;

      case '/version':
        this.showVersion();
        break;

      case '/tools':
        this.showTools();
        break;

      case '/memory':
        await this.handleMemoryCommand(args);
        break;

      case '/settings':
        await this.handleSettingsCommand(args);
        break;

      case '/restore':
        await this.handleRestoreCommand(args);
        break;

      case '/clear':
        this.conversationHistory = [];
        console.log(`${colors.green}Conversation history cleared${colors.reset}`);
        await this.historyManager.log('Conversation history cleared');
        break;

      case '/history':
        this.showHistory();
        break;

      case '/sessions':
        await this.listSessions();
        break;

      case '/save':
        await this.saveSession();
        break;

      case '/load':
        if (!args) {
          console.log(`${colors.yellow}Usage:${colors.reset} /load <session-id>`);
        } else {
          await this.loadSession(args);
        }
        break;

      case '/markdown':
        this.markdownEnabled = !this.markdownEnabled;
        await this.settingsManager.set('markdownEnabled', this.markdownEnabled);
        console.log(`${colors.green}Markdown rendering ${this.markdownEnabled ? 'enabled' : 'disabled'}${colors.reset}`);
        break;

      case '/yolo':
        this.yolomode = !this.yolomode;
        console.log(`${colors.green}YOLO mode ${this.yolomode ? 'ENABLED' : 'DISABLED'}${colors.reset}`);
        if (this.yolomode) {
          console.log(`${colors.yellow}Warning: Shell commands will execute without confirmation!${colors.reset}`);
        }
        break;

      case '/init':
        await this.handleInitCommand(args);
        break;

      case '/exit':
        await this.saveSession();
        console.log(`${colors.green}Session saved.${colors.reset}`);
        if (this.rl) {
          this.rl.close();
        } else {
          process.exit(0);
        }
        break;

      default:
          // Handle empty command after slash (user just pressed Enter)
          if (cmd === '/' && !args) {
            console.log(`${colors.yellow}Type a command after / or press TAB for autocomplete${colors.reset}`);
          } else {
            // Show suggestion for unknown command
            const bestMatch = await this.fuzzyMatchCommand(cmd);
            if (bestMatch !== cmd && bestMatch) {
              console.log(`${colors.red}Unknown command:${colors.reset} ${command}`);
              console.log(`${colors.yellow}Did you mean:${colors.reset} ${colors.cyan}${bestMatch}${colors.reset}?`);
              console.log(`Type ${colors.cyan}/help${colors.reset} for available commands`);
            } else {
              console.log(`${colors.red}Unknown command:${colors.reset} ${command}`);
              console.log(`Type ${colors.cyan}/help${colors.reset} for available commands`);
            }
          }
    }
  }

  /**
   * Handle custom TOML commands
   */
  async handleCustomCommand(commandName, args) {
    const processed = this.commandLoader.processCommand(commandName, args);

    if (!processed) {
      console.log(`${colors.red}Command not found:${colors.reset} ${commandName}`);
      return;
    }

    console.log(`${colors.blue}[Custom Command]${colors.reset} ${colors.dim}${processed.description}${colors.reset}`);

    // Process the command's prompt as a regular message
    await this.processMessage(processed.processedPrompt);
  }

  /**
   * Handle /memory commands
   */
  async handleMemoryCommand(args) {
    const parts = args.split(/\s+/);
    const subcommand = parts[0];

    switch (subcommand) {
      case 'set':
      case 'add':
        if (parts.length < 3) {
          console.log(`${colors.yellow}Usage:${colors.reset} /memory set <key> <value>`);
          return;
        }
        const key = parts[1];
        const value = parts.slice(2).join(' ');
        await this.memoryManager.set(key, value);
        console.log(`${colors.green}Memory saved:${colors.reset} ${key} = ${value}`);
        break;

      case 'get':
        if (parts.length < 2) {
          console.log(`${colors.yellow}Usage:${colors.reset} /memory get <key>`);
          return;
        }
        const getValue = this.memoryManager.get(parts[1]);
        if (getValue !== null) {
          console.log(`${colors.cyan}${parts[1]}:${colors.reset} ${getValue}`);
        } else {
          console.log(`${colors.red}Not found:${colors.reset} ${parts[1]}`);
        }
        break;

      case 'list':
        const entries = this.memoryManager.list();
        if (entries.length === 0) {
          console.log(`${colors.dim}No memory entries${colors.reset}`);
        } else {
          console.log(`\n${colors.bright}Memory Entries:${colors.reset}\n`);
          entries.forEach(entry => {
            console.log(`  ${colors.cyan}${entry.key}:${colors.reset} ${entry.value}`);
            console.log(`  ${colors.dim}  (${entry.type}, saved: ${new Date(entry.timestamp).toLocaleString()})${colors.reset}\n`);
          });
        }
        break;

      case 'delete':
      case 'remove':
        if (parts.length < 2) {
          console.log(`${colors.yellow}Usage:${colors.reset} /memory delete <key>`);
          return;
        }
        const deleted = await this.memoryManager.delete(parts[1]);
        if (deleted) {
          console.log(`${colors.green}Memory deleted:${colors.reset} ${parts[1]}`);
        } else {
          console.log(`${colors.red}Not found:${colors.reset} ${parts[1]}`);
        }
        break;

      case 'clear':
        await this.memoryManager.clear();
        console.log(`${colors.green}All memory cleared${colors.reset}`);
        break;

      case 'search':
        if (parts.length < 2) {
          console.log(`${colors.yellow}Usage:${colors.reset} /memory search <query>`);
          return;
        }
        const query = parts.slice(1).join(' ');
        const results = this.memoryManager.search(query);
        if (results.length === 0) {
          console.log(`${colors.dim}No results found${colors.reset}`);
        } else {
          console.log(`\n${colors.bright}Search Results:${colors.reset}\n`);
          results.forEach(result => {
            console.log(`  ${colors.cyan}${result.key}:${colors.reset} ${result.value}`);
          });
        }
        break;

      case 'show':
        if (this.polzaMdLoader.hasInstructions()) {
          const loadedFiles = this.polzaMdLoader.getLoadedFiles();
          console.log(`\n${colors.bright}Custom Instructions (POLZA.md):${colors.reset}\n`);
          console.log(`${colors.yellow}Loaded from:${colors.reset}`);
          loadedFiles.forEach(file => {
            console.log(`  ${colors.dim}${file}${colors.reset}`);
          });
          console.log(`\n${colors.yellow}Instructions Preview:${colors.reset}`);
          const preview = this.customInstructions.substring(0, 500);
          console.log(preview + (this.customInstructions.length > 500 ? '...' : ''));
        } else {
          console.log(`${colors.dim}No POLZA.md files found${colors.reset}`);
          console.log(`\n${colors.yellow}Tip:${colors.reset} Use ${colors.cyan}/init${colors.reset} to create a POLZA.md file`);
        }
        break;

      case 'refresh':
      case 'reload':
        console.log(`${colors.yellow}Reloading POLZA.md files...${colors.reset}`);
        this.customInstructions = await this.polzaMdLoader.reload();
        if (this.polzaMdLoader.hasInstructions()) {
          console.log(`${colors.green}Reloaded ${this.polzaMdLoader.getLoadedFiles().length} POLZA.md file(s)${colors.reset}`);
        } else {
          console.log(`${colors.dim}No POLZA.md files found${colors.reset}`);
        }
        break;

      default:
        const summary = this.memoryManager.getSummary();
        console.log(`\n${colors.bright}Memory Summary:${colors.reset}`);
        console.log(`  Entries: ${summary.totalEntries}`);
        console.log(`  File: ${summary.memoryFile}`);
        if (this.polzaMdLoader.hasInstructions()) {
          console.log(`  POLZA.md files: ${this.polzaMdLoader.getLoadedFiles().length} loaded`);
        }
        console.log(`\n${colors.yellow}Subcommands:${colors.reset}`);
        console.log(`  /memory set <key> <value> - Save a memory`);
        console.log(`  /memory get <key>         - Retrieve a memory`);
        console.log(`  /memory list              - List all memories`);
        console.log(`  /memory search <query>    - Search memories`);
        console.log(`  /memory delete <key>      - Delete a memory`);
        console.log(`  /memory clear             - Clear all memories`);
        console.log(`  /memory show              - Show custom instructions (POLZA.md)`);
        console.log(`  /memory refresh           - Reload POLZA.md files`);
    }
  }

  /**
   * Handle /settings commands
   */
  async handleSettingsCommand(args) {
    const parts = args.split(/\s+/);
    const subcommand = parts[0];

    switch (subcommand) {
      case 'set':
        if (parts.length < 3) {
          console.log(`${colors.yellow}Usage:${colors.reset} /settings set <key> <value>`);
          return;
        }
        const key = parts[1];
        let value = parts.slice(2).join(' ');

        // Parse boolean and number values
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (!isNaN(value)) value = parseFloat(value);

        await this.settingsManager.set(key, value);
        console.log(`${colors.green}Setting saved:${colors.reset} ${key} = ${value}`);
        break;

      case 'get':
        if (parts.length < 2) {
          console.log(`${colors.yellow}Usage:${colors.reset} /settings get <key>`);
          return;
        }
        const getValue = this.settingsManager.get(parts[1]);
        console.log(`${colors.cyan}${parts[1]}:${colors.reset} ${getValue}`);
        break;

      case 'reset':
        await this.settingsManager.reset();
        console.log(`${colors.green}Settings reset to defaults${colors.reset}`);
        break;

      case 'path':
        console.log(`${colors.cyan}Settings file:${colors.reset} ${this.settingsManager.getSettingsPath()}`);
        break;

      default:
        const settings = this.settingsManager.getAll();
        console.log(`\n${colors.bright}Current Settings:${colors.reset}\n`);
        Object.entries(settings).forEach(([key, value]) => {
          console.log(`  ${colors.cyan}${key}:${colors.reset} ${JSON.stringify(value)}`);
        });
        console.log(`\n${colors.yellow}Subcommands:${colors.reset}`);
        console.log(`  /settings set <key> <value> - Change a setting`);
        console.log(`  /settings get <key>         - Get a setting value`);
        console.log(`  /settings reset             - Reset to defaults`);
        console.log(`  /settings path              - Show settings file path`);
    }
  }

  /**
   * Handle /restore command (restore session)
   */
  async handleRestoreCommand(args) {
    if (!args) {
      const sessions = await this.historyManager.listSessions();
      if (sessions.length === 0) {
        console.log(`${colors.dim}No saved sessions to restore${colors.reset}`);
        return;
      }

      console.log(`\n${colors.bright}Available Sessions:${colors.reset}\n`);
      sessions.forEach((session, index) => {
        console.log(`  ${colors.cyan}${index + 1}. ${session.id}${colors.reset}`);
        console.log(`     ${colors.dim}${new Date(session.date).toLocaleString()}${colors.reset}`);
      });
      console.log(`\n${colors.yellow}Usage:${colors.reset} /restore <session-id>`);
    } else {
      await this.loadSession(args);
    }
  }

  /**
   * Handle /init command (create POLZA.md file)
   */
  async handleInitCommand(args) {
    const filePath = args || 'POLZA.md';

    try {
      // Check if file already exists
      const fs = await import('fs/promises');
      try {
        await fs.access(filePath);
        console.log(`${colors.yellow}Warning:${colors.reset} ${filePath} already exists`);
        console.log(`Use ${colors.cyan}/memory show${colors.reset} to view current instructions`);
        return;
      } catch {
        // File doesn't exist, proceed with creation
      }

      await createDefaultPolzaMd(filePath);
      console.log(`${colors.green}Created ${filePath}${colors.reset}`);
      console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
      console.log(`1. Edit ${filePath} to add your custom instructions`);
      console.log(`2. Restart polza-cli or use ${colors.cyan}/memory reload${colors.reset} to load the instructions`);
      console.log(`\n${colors.yellow}Tip:${colors.reset} POLZA.md files are loaded from:`);
      console.log(`  - Current directory (most specific)`);
      console.log(`  - Parent directories`);
      console.log(`  - ~/.polza-cli/POLZA.md (user-level)`);
      console.log(`  - ~/.config/polza-cli/POLZA.md (global)`);
    } catch (error) {
      console.error(`${colors.red}Error creating ${filePath}:${colors.reset} ${error.message}`);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`\n${colors.bright}${colors.green}Polza CLI Help${colors.reset}\n`);

    console.log(`${colors.yellow}Built-in Commands:${colors.reset}`);
    console.log(`  ${colors.cyan}/help${colors.reset}                    - Show this help`);
    console.log(`  ${colors.cyan}/version${colors.reset}                 - Show version information`);
    console.log(`  ${colors.cyan}/tools${colors.reset}                   - List available tools`);
    console.log(`  ${colors.cyan}/memory [subcommand]${colors.reset}     - Manage persistent memory & POLZA.md`);
    console.log(`  ${colors.cyan}/settings [subcommand]${colors.reset}   - View/modify settings`);
    console.log(`  ${colors.cyan}/init [filename]${colors.reset}         - Create a POLZA.md file`);
    console.log(`  ${colors.cyan}/restore [session-id]${colors.reset}    - Restore a saved session`);
    console.log(`  ${colors.cyan}/clear${colors.reset}                   - Clear conversation history`);
    console.log(`  ${colors.cyan}/history${colors.reset}                 - Show conversation history`);
    console.log(`  ${colors.cyan}/sessions${colors.reset}                - List saved sessions`);
    console.log(`  ${colors.cyan}/save${colors.reset}                    - Save current session`);
    console.log(`  ${colors.cyan}/load <id>${colors.reset}               - Load a saved session`);
    console.log(`  ${colors.cyan}/markdown${colors.reset}                - Toggle markdown rendering`);
    console.log(`  ${colors.cyan}/yolo${colors.reset}                    - Toggle YOLO mode (shell execution)`);
    console.log(`  ${colors.cyan}/exit${colors.reset}                    - Exit the CLI`);

    const customCommands = this.commandLoader.getAllCommands();
    if (customCommands.length > 0) {
      console.log(`\n${colors.yellow}Custom Commands:${colors.reset}`);
      customCommands.forEach(cmd => {
        console.log(`  ${colors.cyan}/${cmd.name}${colors.reset} - ${cmd.description}`);
      });
    }

    console.log(`\n${colors.yellow}Special Syntax:${colors.reset}`);
    console.log(`  ${colors.cyan}@file.js${colors.reset}     - Include file content in your prompt`);
    console.log(`  ${colors.cyan}@src/${colors.reset}        - Include directory listing`);
    console.log(`  ${colors.cyan}@"path/file"${colors.reset} - Quote paths with spaces`);
    if (this.yolomode) {
      console.log(`  ${colors.cyan}!ls -la${colors.reset}      - Execute shell command (YOLO mode only)`);
      console.log(`  ${colors.cyan}!{pwd}${colors.reset}       - Execute shell command (alt syntax)`);
    }
    console.log(`\n${colors.yellow}Autocompletion:${colors.reset}`);
    console.log(`  ${colors.cyan}TAB${colors.reset}          - Autocomplete commands and file paths (use TAB while typing)`);

    console.log(`\n${colors.yellow}CLI Flags:${colors.reset}`);
    console.log(`  ${colors.cyan}-p, --prompt${colors.reset}           - Non-interactive mode`);
    console.log(`  ${colors.cyan}-i, --prompt-interactive${colors.reset} - Start with prompt, then interactive`);
    console.log(`  ${colors.cyan}-m, --model${colors.reset}            - Select AI model`);
    console.log(`  ${colors.cyan}-y, --yolo${colors.reset}             - Enable YOLO mode (auto-approve)`);
    console.log(`  ${colors.cyan}--help${colors.reset}                 - Show CLI help`);

    console.log(`\n${colors.yellow}Examples:${colors.reset}`);
    console.log(`  polza-cli`);
    console.log(`  polza-cli --yolo`);
    console.log(`  polza-cli -m "openai/gpt-4o"`);
    console.log(`  polza-cli -p "Explain @README.md"`);
    console.log(`  polza-cli -p "List files: !ls -la" --yolo`);
    console.log(`  polza-cli -p "Show git status: !git status" --yolo`);
    console.log();
  }

  /**
   * Show version information
   */
  showVersion() {
    console.log(`\n${colors.bright}${colors.green}Polza CLI${colors.reset} ${colors.dim}(Enhanced Edition)${colors.reset}`);
    console.log(`${colors.yellow}Version:${colors.reset} 1.0.0`);
    console.log(`${colors.yellow}Node.js:${colors.reset} ${process.version}`);
    console.log(`${colors.yellow}Platform:${colors.reset} ${process.platform} (${process.arch})`);
    console.log(`\n${colors.bright}Features:${colors.reset}`);
    console.log(`  ✅ Enhanced command preview with fuzzy matching`);
    console.log(`  ✅ Inline command suggestions (zsh-style)`);
    console.log(`  ✅ Smart file and command autocompletion`);
    console.log(`  ✅ Tab autocompletion for commands and files`);
    console.log(`  ✅ File inclusion syntax (@file.js)`);
    console.log(`  ✅ Shell command execution (!command)`);
    console.log(`  ✅ Custom commands via TOML files`);
    console.log(`  ✅ Persistent memory management`);
    console.log(`  ✅ Custom instructions (POLZA.md)`);
    console.log(`  ✅ Session management & history`);
    console.log(`\n${colors.yellow}Repository:${colors.reset} https://github.com/judas-priest/hives`);
    console.log(`${colors.yellow}License:${colors.reset} Unlicense (Public Domain)`);
    console.log();
  }

  /**
   * Show available tools
   */
  showTools() {
    console.log(`\n${colors.bright}${colors.green}Available Tools${colors.reset}\n`);

    const allTools = [...fileSystemTools, ...advancedTools];

    allTools.forEach((tool, index) => {
      const func = tool.function;
      console.log(`${colors.cyan}${index + 1}. ${func.name}${colors.reset}`);
      console.log(`   ${colors.dim}${func.description}${colors.reset}`);

      const params = Object.keys(func.parameters.properties);
      if (params.length > 0) {
        console.log(`   ${colors.yellow}Parameters:${colors.reset} ${params.join(', ')}`);
      }
      console.log();
    });
  }

  /**
   * Show conversation history
   */
  showHistory() {
    if (this.conversationHistory.length === 0) {
      console.log(`${colors.dim}No conversation history yet${colors.reset}`);
      return;
    }

    console.log(`\n${colors.bright}${colors.green}Conversation History${colors.reset}\n`);

    this.conversationHistory.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      const roleColor = msg.role === 'user' ? colors.cyan : colors.magenta;

      console.log(`${roleColor}${role}${colors.reset}:`);

      if (typeof msg.content === 'string') {
        console.log(`  ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`);
      } else if (msg.tool_calls) {
        msg.tool_calls.forEach(tc => {
          console.log(`  ${colors.yellow}[Tool Call]${colors.reset} ${tc.function.name}`);
        });
      } else if (msg.tool_call_id) {
        console.log(`  ${colors.yellow}[Tool Response]${colors.reset}`);
      }

      console.log();
    });
  }

  /**
   * Process user message
   */
  async processMessage(userInput) {
    try {
      // Process prompt for @file and !shell syntax
      let processedInput = userInput;
      let metadata = { filesIncluded: [], shellCommands: [], errors: [] };

      if (hasSpecialSyntax(userInput)) {
        const result = await processPrompt(userInput, this.yolomode);
        processedInput = result.prompt;
        metadata = result.metadata;

        // Show what was processed
        if (metadata.filesIncluded.length > 0) {
          console.log(`${colors.blue}[Files Included]${colors.reset} ${metadata.filesIncluded.length} file(s)`);
        }
        if (metadata.shellCommands.length > 0) {
          console.log(`${colors.blue}[Shell Commands]${colors.reset} ${metadata.shellCommands.length} executed`);
        }
        if (metadata.errors.length > 0) {
          metadata.errors.forEach(err => {
            console.log(`${colors.yellow}[Warning]${colors.reset} ${err.message}`);
          });
        }
      }

      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: processedInput
      });

      // Log user input
      await this.historyManager.logChat('user', userInput);

      console.log(`${colors.magenta}Assistant${colors.reset} > ${colors.dim}Thinking...${colors.reset}`);

      // Prepend POLZA.md custom instructions to conversation history (if this is the first message)
      let messagesWithInstructions = this.conversationHistory;
      if (this.customInstructions && this.conversationHistory.filter(m => m.role === 'user').length === 1) {
        // First user message, add custom instructions
        const systemMessage = this.polzaMdLoader.createSystemMessage();
        if (systemMessage) {
          messagesWithInstructions = [systemMessage, ...this.conversationHistory];
        }
      }

      // Combine all tools
      const allTools = [...fileSystemTools, ...advancedTools];

      // Make API call with tools
      let response = await this.client.chat(messagesWithInstructions, {
        tools: allTools,
        tool_choice: 'auto'
      });

      // Handle tool calls if present
      let iterationCount = 0;
      const maxIterations = 10;

      while (response.choices[0].finish_reason === 'tool_calls' && iterationCount < maxIterations) {
        iterationCount++;
        const assistantMessage = response.choices[0].message;
        this.conversationHistory.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`${colors.yellow}[Tool]${colors.reset} ${colors.dim}Executing ${toolCall.function.name}...${colors.reset}`);

          const toolArgs = JSON.parse(toolCall.function.arguments);
          let toolResult;

          // Determine which tool set to use
          if (fileSystemTools.some(t => t.function.name === toolCall.function.name)) {
            toolResult = await executeFileSystemTool(toolCall.function.name, toolArgs);
          } else if (advancedTools.some(t => t.function.name === toolCall.function.name)) {
            toolResult = await executeAdvancedTool(toolCall.function.name, toolArgs, this.yolomode);
          } else {
            toolResult = { error: true, message: `Unknown tool: ${toolCall.function.name}` };
          }

          // Add tool response to history
          this.conversationHistory.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResult)
          });
        }

        // Get next response
        response = await this.client.chat(this.conversationHistory, {
          tools: allTools,
          tool_choice: 'auto'
        });
      }

      // Add final assistant message to history
      const finalMessage = response.choices[0].message;
      this.conversationHistory.push(finalMessage);

      // Display response
      const responseText = finalMessage.content;
      if (this.markdownEnabled && hasMarkdown(responseText)) {
        const rendered = renderMarkdown(responseText);
        console.log(`\r${colors.magenta}Assistant${colors.reset} >`);
        console.log(rendered);
      } else {
        console.log(`\r${colors.magenta}Assistant${colors.reset} > ${responseText}`);
      }

      // Log the interaction
      await this.historyManager.logChat('assistant', responseText, {
        tokens: response.usage?.total_tokens,
        cost: response.usage?.cost
      });

      // Display usage info
      if (response.usage) {
        const usage = response.usage;
        const cost = usage.cost || 0;
        console.log(`${colors.dim}[Tokens: ${usage.total_tokens} | Cost: ${cost.toFixed(4)} RUB]${colors.reset}`);
      }

      console.log();

      // Auto-save history
      await this.historyManager.saveHistory(this.conversationHistory);
    } catch (error) {
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
      await this.historyManager.log(`Error: ${error.message}`, 'error');
      console.log();
    }
  }

  /**
   * List saved sessions
   */
  async listSessions() {
    const sessions = await this.historyManager.listSessions();

    if (sessions.length === 0) {
      console.log(`${colors.dim}No saved sessions found${colors.reset}`);
      return;
    }

    console.log(`\n${colors.bright}${colors.green}Saved Sessions${colors.reset}\n`);

    sessions.forEach((session, index) => {
      const date = new Date(session.date);
      const dateStr = date.toLocaleString();
      const sizeKB = (session.size / 1024).toFixed(2);

      console.log(`${colors.cyan}${index + 1}. ${session.id}${colors.reset}`);
      console.log(`   ${colors.dim}Date: ${dateStr} | Size: ${sizeKB} KB${colors.reset}`);
    });

    console.log();
  }

  /**
   * Save current session
   */
  async saveSession() {
    if (this.conversationHistory.length === 0) {
      console.log(`${colors.yellow}No conversation to save${colors.reset}`);
      return;
    }

    const metadata = {
      messageCount: this.conversationHistory.length,
      model: this.client.model,
      savedAt: new Date().toISOString()
    };

    const file = await this.historyManager.saveSession(this.conversationHistory, metadata);

    if (file) {
      console.log(`${colors.green}Session saved:${colors.reset} ${this.historyManager.getSessionId()}`);
      await this.historyManager.log('Session saved');
    } else {
      console.log(`${colors.red}Failed to save session${colors.reset}`);
    }
  }

  /**
   * Load a saved session
   */
  async loadSession(sessionId) {
    const session = await this.historyManager.loadSession(sessionId);

    if (!session) {
      console.log(`${colors.red}Session not found:${colors.reset} ${sessionId}`);
      return;
    }

    this.conversationHistory = session.history || [];
    console.log(`${colors.green}Session loaded:${colors.reset} ${sessionId}`);
    console.log(`${colors.dim}Messages: ${this.conversationHistory.length}${colors.reset}`);
    await this.historyManager.log(`Session loaded: ${sessionId}`);
  }
}

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .scriptName('polza-cli')
  .usage('Usage: $0 [options]')
  .option('prompt', {
    alias: 'p',
    type: 'string',
    description: 'Run in non-interactive mode with a prompt'
  })
  .option('prompt-interactive', {
    alias: 'i',
    type: 'string',
    description: 'Start with a prompt, then enter interactive mode'
  })
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Select the AI model to use'
  })
  .option('yolomode', {
    alias: 'yolo',
    type: 'boolean',
    default: false,
    description: 'Enable YOLO mode (auto-approve shell commands)'
  })
  .option('output-format', {
    alias: 'o',
    type: 'string',
    choices: ['text', 'json'],
    default: 'text',
    description: 'Output format'
  })
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .parseSync();

// Start the CLI
const cli = new PolzaCLI(argv);
cli.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
