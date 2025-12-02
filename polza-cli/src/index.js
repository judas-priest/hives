#!/usr/bin/env node

/**
 * Polza CLI - A CLI client with chat support and file system access using Polza AI
 */

import readline from 'readline';
import { PolzaClient } from './lib/polza-client.js';
import { fileSystemTools, executeFileSystemTool } from './tools/filesystem.js';

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
      console.log(`${colors.yellow}Commands:${colors.reset}`);
      console.log(`  ${colors.dim}/help${colors.reset}     - Show available commands`);
      console.log(`  ${colors.dim}/tools${colors.reset}    - List available file system tools`);
      console.log(`  ${colors.dim}/clear${colors.reset}    - Clear conversation history`);
      console.log(`  ${colors.dim}/history${colors.reset}  - Show conversation history`);
      console.log(`  ${colors.dim}/exit${colors.reset}     - Exit the CLI\n`);

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
    const cmd = command.toLowerCase();

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
        break;

      case '/history':
        this.showHistory();
        break;

      case '/exit':
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
    console.log(`  ${colors.cyan}/help${colors.reset}     - Show this help message`);
    console.log(`  ${colors.cyan}/tools${colors.reset}    - List available file system tools`);
    console.log(`  ${colors.cyan}/clear${colors.reset}    - Clear conversation history`);
    console.log(`  ${colors.cyan}/history${colors.reset}  - Show conversation history`);
    console.log(`  ${colors.cyan}/exit${colors.reset}     - Exit the CLI\n`);

    console.log(`${colors.yellow}Features:${colors.reset}`);
    console.log(`  • Chat with AI assistant powered by ${this.client.model}`);
    console.log(`  • File system access (read, write, list, etc.)`);
    console.log(`  • Tool calling support for complex tasks`);
    console.log(`  • Persistent conversation history within session\n`);

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

      // Display response
      console.log(`\r${colors.magenta}Assistant${colors.reset} > ${finalMessage.content}`);

      // Display usage info
      if (response.usage) {
        const usage = response.usage;
        const cost = usage.cost || 0;
        console.log(`${colors.dim}[Tokens: ${usage.total_tokens} | Cost: ${cost.toFixed(4)} RUB]${colors.reset}`);
      }

      console.log();
    } catch (error) {
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
      console.log();
    }
  }
}

// Start the CLI
const cli = new PolzaCLI();
cli.start();
