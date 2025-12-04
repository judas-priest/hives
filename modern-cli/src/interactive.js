/**
 * Interactive Mode - Main chat interface
 */

import { stdin as input, stdout as output } from 'process';
import chalk from 'chalk';
import ora from 'ora';
import { PolzaClient } from './lib/polza-client.js';
import { getTools, getToolHandlers } from './lib/tools.js';
import { renderMarkdown } from './ui/markdown.js';
import { processPrompt } from './utils/prompt-processor.js';
import { handleCommand } from './commands/index.js';
import { createCompleter } from './utils/completer.js';
import { createEnhancedReadline } from './utils/enhanced-readline.js';

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

  // Create enhanced readline interface with visual autocomplete
  const rl = createEnhancedReadline({
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

  // Track Ctrl+C presses for double Ctrl+C exit
  let ctrlCCount = 0;
  let ctrlCTimeout = null;
  let sigintReceived = false; // Track if SIGINT was just received

  // Handle readline close event
  rl.on('close', () => {
    isClosed = true;
  });

  // Handle SIGINT (Ctrl+C) gracefully with double-press to exit
  rl.on('SIGINT', () => {
    sigintReceived = true; // Mark that SIGINT was received
    ctrlCCount++;

    // Clear existing timeout
    if (ctrlCTimeout) {
      clearTimeout(ctrlCTimeout);
    }

    if (ctrlCCount === 1) {
      console.log(chalk.yellow('\n(To exit, press Ctrl+C again or type /exit)'));

      // Reset count after 2 seconds
      ctrlCTimeout = setTimeout(() => {
        ctrlCCount = 0;
      }, 2000);
    } else if (ctrlCCount >= 2) {
      // Second Ctrl+C - exit
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      rl.close();
      process.exit(0);
    }
  });

  // REPL loop
  while (!isClosed) {
    try {
      const userInput = await question(chalk.green.bold('You > '));

      // If SIGINT was received, skip processing this empty input
      // (readline emits an empty line after SIGINT)
      if (sigintReceived) {
        sigintReceived = false;
        continue;
      }

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

      // Process prompt (handle @file, @image and !shell syntax)
      const { text: processedPrompt, images } = await processPrompt(userInput, config.yoloMode);

      // Pause readline while showing spinner to avoid conflicts
      rl.pause();

      // Show thinking spinner
      const spinner = ora({
        text: 'Thinking...',
        color: 'cyan',
        stream: process.stderr, // Use stderr to avoid conflicts with stdout
      }).start();

      try {
        // Send to AI with tools and optional images
        const response = await client.chatWithTools(processedPrompt, {
          model: config.model,
          tools,
          toolHandlers,
          images: images.length > 0 ? images : undefined,
        });

        spinner.stop();
        spinner.clear(); // Clear spinner artifacts

        // Render response
        const assistantMessage = response.choices[0].message.content;
        console.log(chalk.blue.bold('\nAssistant > '));
        renderMarkdown(assistantMessage);
        console.log();
      } catch (error) {
        spinner.stop();
        spinner.clear(); // Clear spinner artifacts
        console.error(chalk.red('✗ Error:'), error.message);
        console.log();
      } finally {
        // Always resume readline after spinner is done
        if (!isClosed) {
          rl.resume();
        }
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
