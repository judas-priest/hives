#!/usr/bin/env node

/**
 * Polza CLI - A CLI client with chat support and file system access using Polza AI
 */

import readline from 'readline';
import { PolzaClient } from './lib/polza-client.js';
import { fileSystemTools, executeFileSystemTool } from './tools/filesystem.js';
import { HistoryManager } from './lib/history-manager.js';
import { renderMarkdown, hasMarkdown } from './lib/markdown-renderer.js';

// ANSI color codes for better output
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
  constructor() {
    this.conversationHistory = [];
    this.client = null;
    this.rl = null;
    this.historyManager = new HistoryManager();
    this.commandHistory = []; // For command line history navigation
    this.commandHistoryIndex = -1;
    this.markdownEnabled = true; // Enable markdown rendering by default
  }

  /**
   * Initialize the CLI
   */
  async initialize() {
    try {
      // Initialize Polza client
      this.client = new PolzaClient();

      // Create readline interface
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${colors.cyan}You${colors.reset} > `
      });

      console.log(`${colors.bright}${colors.green}Polza CLI${colors.reset}`);
      console.log(`${colors.dim}Chat with AI and access your file system${colors.reset}\n`);
      console.log(`${colors.yellow}Model:${colors.reset} ${this.client.model}`);
      console.log(`${colors.yellow}Session ID:${colors.reset} ${this.historyManager.getSessionId()}`);
      console.log(`${colors.yellow}Config Dir:${colors.reset} ${this.historyManager.getConfigDir()}`);
      console.log(`${colors.yellow}Commands:${colors.reset}`);
      console.log(`  ${colors.dim}/help${colors.reset}      - Show available commands`);
      console.log(`  ${colors.dim}/tools${colors.reset}     - List available file system tools`);
      console.log(`  ${colors.dim}/clear${colors.reset}     - Clear conversation history`);
      console.log(`  ${colors.dim}/history${colors.reset}   - Show conversation history`);
      console.log(`  ${colors.dim}/sessions${colors.reset}  - List saved sessions`);
      console.log(`  ${colors.dim}/save${colors.reset}      - Save current session`);
      console.log(`  ${colors.dim}/load${colors.reset}      - Load a session`);
      console.log(`  ${colors.dim}/markdown${colors.reset}  - Toggle markdown rendering`);
      console.log(`  ${colors.dim}/exit${colors.reset}      - Exit the CLI\n`);

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
   * Start the chat loop
   */
  async start() {
    if (!(await this.initialize())) {
      process.exit(1);
    }

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const trimmedInput = input.trim();

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
   * Handle special commands
   */
  async handleCommand(command) {
    const parts = command.toLowerCase().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
      case '/help':
        this.showHelp();
        break;

      case '/tools':
        this.showTools();
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
        if (args.length === 0) {
          console.log(`${colors.yellow}Usage:${colors.reset} /load <session-id>`);
          console.log(`Use ${colors.cyan}/sessions${colors.reset} to see available sessions`);
        } else {
          await this.loadSession(args[0]);
        }
        break;

      case '/markdown':
        this.markdownEnabled = !this.markdownEnabled;
        console.log(`${colors.green}Markdown rendering ${this.markdownEnabled ? 'enabled' : 'disabled'}${colors.reset}`);
        await this.historyManager.log(`Markdown rendering ${this.markdownEnabled ? 'enabled' : 'disabled'}`);
        break;

      case '/exit':
        await this.saveSession(); // Auto-save on exit
        console.log(`${colors.green}Session saved.${colors.reset}`);
        this.rl.close();
        break;

      default:
        console.log(`${colors.red}Unknown command:${colors.reset} ${command}`);
        console.log(`Type ${colors.cyan}/help${colors.reset} for available commands`);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`\n${colors.bright}${colors.green}Polza CLI Help${colors.reset}\n`);
    console.log(`${colors.yellow}Commands:${colors.reset}`);
    console.log(`  ${colors.cyan}/help${colors.reset}      - Show this help message`);
    console.log(`  ${colors.cyan}/tools${colors.reset}     - List available file system tools`);
    console.log(`  ${colors.cyan}/clear${colors.reset}     - Clear conversation history`);
    console.log(`  ${colors.cyan}/history${colors.reset}   - Show conversation history`);
    console.log(`  ${colors.cyan}/sessions${colors.reset}  - List all saved sessions`);
    console.log(`  ${colors.cyan}/save${colors.reset}      - Save current session to disk`);
    console.log(`  ${colors.cyan}/load <id>${colors.reset} - Load a saved session`);
    console.log(`  ${colors.cyan}/markdown${colors.reset}  - Toggle markdown rendering on/off`);
    console.log(`  ${colors.cyan}/exit${colors.reset}      - Save and exit the CLI\n`);

    console.log(`${colors.yellow}Features:${colors.reset}`);
    console.log(`  • Chat with AI assistant powered by ${this.client.model}`);
    console.log(`  • File system access (read, write, list, etc.)`);
    console.log(`  • Tool calling support for complex tasks`);
    console.log(`  • Persistent conversation history (saved to ~/.config/polza-cli)`);
    console.log(`  • Session management (save/load chat sessions)`);
    console.log(`  • Markdown rendering for beautiful terminal output`);
    console.log(`  • Automatic logging to ~/.config/polza-cli/logs\n`);

    console.log(`${colors.yellow}Examples:${colors.reset}`);
    console.log(`  "Read the contents of README.md"`);
    console.log(`  "List all files in the current directory"`);
    console.log(`  "Create a new file called test.txt with hello world"`);
    console.log(`  "What files are in the src directory?"\n`);
  }

  /**
   * Show available tools
   */
  showTools() {
    console.log(`\n${colors.bright}${colors.green}Available File System Tools${colors.reset}\n`);

    fileSystemTools.forEach((tool, index) => {
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

    this.conversationHistory.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      const roleColor = msg.role === 'user' ? colors.cyan : colors.magenta;

      console.log(`${roleColor}${role}${colors.reset}:`);

      if (typeof msg.content === 'string') {
        console.log(`  ${msg.content}`);
      } else if (msg.tool_calls) {
        msg.tool_calls.forEach(tc => {
          console.log(`  ${colors.yellow}[Tool Call]${colors.reset} ${tc.function.name}(${tc.function.arguments})`);
        });
      } else if (msg.tool_call_id) {
        console.log(`  ${colors.yellow}[Tool Response]${colors.reset} ${msg.content.substring(0, 100)}...`);
      }

      console.log();
    });
  }

  /**
   * Process user message and get AI response
   */
  async processMessage(userInput) {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userInput
      });

      // Log user input
      await this.historyManager.logChat('user', userInput);

      console.log(`${colors.magenta}Assistant${colors.reset} > ${colors.dim}Thinking...${colors.reset}`);

      // Make API call with tools
      let response = await this.client.chat(this.conversationHistory, {
        tools: fileSystemTools,
        tool_choice: 'auto'
      });

      // Handle tool calls if present
      while (response.choices[0].finish_reason === 'tool_calls') {
        const assistantMessage = response.choices[0].message;
        this.conversationHistory.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`${colors.yellow}[Tool]${colors.reset} ${colors.dim}Executing ${toolCall.function.name}...${colors.reset}`);

          const toolArgs = JSON.parse(toolCall.function.arguments);
          const toolResult = await executeFileSystemTool(toolCall.function.name, toolArgs);

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
          tools: fileSystemTools,
          tool_choice: 'auto'
        });
      }

      // Add final assistant message to history
      const finalMessage = response.choices[0].message;
      this.conversationHistory.push(finalMessage);

      // Display response with markdown rendering if enabled
      const responseText = finalMessage.content;
      if (this.markdownEnabled && hasMarkdown(responseText)) {
        const rendered = renderMarkdown(responseText);
        console.log(`\r${colors.magenta}Assistant${colors.reset} >`);
        console.log(rendered);
      } else {
        console.log(`\r${colors.magenta}Assistant${colors.reset} > ${responseText}`);
      }

      // Log the chat interaction
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

      // Auto-save history after each interaction
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

// Start the CLI
const cli = new PolzaCLI();
cli.start();
