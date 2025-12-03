/**
 * Interactive Mode - Main chat interface
 */

import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import chalk from 'chalk';
import ora from 'ora';
import { PolzaClient } from './lib/polza-client.js';
import { getTools, getToolHandlers } from './lib/tools.js';
import { renderMarkdown } from './ui/markdown.js';
import { processPrompt } from './utils/prompt-processor.js';
import { handleCommand } from './commands/index.js';
import { createCompleter } from './utils/completer.js';
import { reverseSearch } from './utils/reverse-search.js';

/**
 * Start interactive session
 */
export async function startInteractive(config) {
  // Initialize Polza client
  const client = new PolzaClient(config.apiKey, config.apiBase);

  // Get tools and handlers
  const tools = getTools(config.yoloMode);
  const toolHandlers = getToolHandlers(config.yoloMode);

  // Command history for fuzzy search
  const commandHistory = [];

  // Create completer with history access
  const completer = createCompleter(() => commandHistory);

  // Create readline interface with autocomplete
  const rl = readline.createInterface({
    input,
    output,
    completer,
    terminal: true,
  });

  // Promisify the question method
  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log(chalk.gray('  Current model: ') + chalk.cyan(config.model));
  if (config.yoloMode) {
    console.log(chalk.yellow('  ⚠️  YOLO Mode: ') + chalk.gray('Shell commands auto-approved'));
  }
  console.log(chalk.gray('  💡 Tip: ') + chalk.dim('Press Tab for autocomplete, use /help for commands'));
  console.log();

  // Track if readline is closed
  let isClosed = false;

  // Handle readline close event
  rl.on('close', () => {
    isClosed = true;
  });

  // Handle SIGINT (Ctrl+C) gracefully
  rl.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n(To exit, type /exit or press Ctrl+C again)\n'));
    rl.prompt();
  });

  // REPL loop
  while (!isClosed) {
    try {
      const userInput = await question(chalk.green.bold('You > '));

      if (!userInput.trim()) {
        continue;
      }

      // Add to history
      if (userInput.trim()) {
        commandHistory.push(userInput.trim());
        // Keep history size manageable
        if (commandHistory.length > 100) {
          commandHistory.shift();
        }
      }

      // Handle slash commands
      if (userInput.startsWith('/')) {
        const shouldExit = await handleCommand(userInput, { client, config, rl });
        if (shouldExit) {
          break;
        }
        continue;
      }

      // Process prompt (handle @file and !shell syntax)
      const processedPrompt = await processPrompt(userInput, config.yoloMode);

      // Show thinking spinner
      const spinner = ora({
        text: 'Thinking...',
        color: 'cyan',
      }).start();

      try {
        // Send to AI with tools
        const response = await client.chatWithTools(processedPrompt, {
          model: config.model,
          tools,
          toolHandlers,
        });

        spinner.stop();

        // Render response
        const assistantMessage = response.choices[0].message.content;
        console.log(chalk.blue.bold('\nAssistant > '));
        renderMarkdown(assistantMessage);
        console.log();
      } catch (error) {
        spinner.stop();
        console.error(chalk.red('✗ Error:'), error.message);
        console.log();
      }
    } catch (error) {
      // Handle different readline errors gracefully
      if (error.message === 'ERR_USE_AFTER_CLOSE' ||
          error.code === 'ERR_USE_AFTER_CLOSE' ||
          error.message?.includes('readline was closed')) {
        break;
      }
      // Check if readline was closed externally (Ctrl+D, EOF, etc.)
      if (isClosed) {
        break;
      }
      console.error(chalk.red('✗ Error:'), error.message);
    }
  }

  // Close readline if not already closed
  if (!isClosed) {
    rl.close();
  }
  console.log(chalk.cyan('\n👋 Goodbye!\n'));
}
