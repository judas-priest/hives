/**
 * Interactive Mode - Main chat interface
 */

import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import chalk from 'chalk';
import ora from 'ora';
import { PolzaClient } from './lib/polza-client.js';
import { getTools, getToolHandlers } from './lib/tools.js';
import { renderMarkdown } from './ui/markdown.js';
import { processPrompt } from './utils/prompt-processor.js';
import { handleCommand } from './commands/index.js';

/**
 * Start interactive session
 */
export async function startInteractive(config) {
  const rl = readline.createInterface({ input, output });

  // Initialize Polza client
  const client = new PolzaClient(config.apiKey, config.apiBase);

  // Get tools and handlers
  const tools = getTools(config.yoloMode);
  const toolHandlers = getToolHandlers(config.yoloMode);

  console.log(chalk.gray('  Current model: ') + chalk.cyan(config.model));
  if (config.yoloMode) {
    console.log(chalk.yellow('  ⚠️  YOLO Mode: ') + chalk.gray('Shell commands auto-approved'));
  }
  console.log();

  // REPL loop
  while (true) {
    try {
      const userInput = await rl.question(chalk.green.bold('You > '));

      if (!userInput.trim()) {
        continue;
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
      if (error.message === 'ERR_USE_AFTER_CLOSE') {
        break;
      }
      console.error(chalk.red('✗ Error:'), error.message);
    }
  }

  rl.close();
  console.log(chalk.cyan('\n👋 Goodbye!\n'));
}
