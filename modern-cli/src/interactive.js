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
import { ContextManager } from './utils/context.js';
import { CustomCommandsManager } from './utils/custom-commands.js';
import { SettingsManager } from './utils/settings.js';
import { ThemeManager } from './utils/themes.js';
import { CheckpointManager } from './utils/checkpoints.js';
import { MCPManager } from './utils/mcp.js';
import { VimMode } from './utils/vim-mode.js';

/**
 * Start interactive session
 */
export async function startInteractive(config) {
  // Initialize managers
  const settingsManager = new SettingsManager();
  await settingsManager.loadSettings();

  // Initialize theme manager
  const themeManager = new ThemeManager(settingsManager);
  await themeManager.loadTheme();

  // Initialize checkpoint manager
  const checkpointManager = new CheckpointManager(settingsManager);
  await checkpointManager.initialize();

  // Initialize MCP manager
  const mcpManager = new MCPManager(settingsManager);
  await mcpManager.initialize();

  // Initialize Polza client
  const client = new PolzaClient(config.apiKey, config.apiBase);

  // Initialize context manager and load context files
  const contextManager = new ContextManager();
  await contextManager.loadContextFiles();
  await contextManager.loadCustomMemory();

  // Initialize custom commands manager
  const customCommands = new CustomCommandsManager();
  await customCommands.loadCommands();

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

  // Initialize vim mode
  const vimMode = new VimMode(rl, settingsManager);
  await vimMode.initialize();

  // Promisify the question method
  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log(chalk.gray('  Current model: ') + chalk.cyan(config.model));
  if (config.stream) {
    console.log(chalk.green('  ⚡ Streaming: ') + chalk.gray('Enabled (character-by-character)'));
  }
  if (config.yoloMode) {
    console.log(chalk.yellow('  ⚠️  YOLO Mode: ') + chalk.gray('Shell commands auto-approved'));
  }

  // Show context and commands status
  const contextCount = contextManager.contexts.length;
  const commandsCount = customCommands.commands.size;
  if (contextCount > 0) {
    console.log(chalk.cyan(`  📝 Context: `) + chalk.gray(`${contextCount} files loaded`));
  }
  if (commandsCount > 0) {
    console.log(chalk.cyan(`  🔧 Custom Commands: `) + chalk.gray(`${commandsCount} available`));
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
    ctrlCCount++;

    // Clear existing timeout
    if (ctrlCTimeout) {
      clearTimeout(ctrlCTimeout);
    }

    if (ctrlCCount === 1) {
      console.log(chalk.yellow('\n(To exit, press Ctrl+C again or type /exit)'));
      sigintReceived = true; // Mark that SIGINT was received

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

      // If SIGINT was received, the question returns empty string
      // Skip this iteration to avoid showing the prompt again immediately
      if (sigintReceived) {
        sigintReceived = false;
        continue;
      }

      if (!userInput.trim()) {
        // Reset Ctrl+C counter when user types something (even if empty)
        if (ctrlCCount > 0) {
          ctrlCCount = 0;
          if (ctrlCTimeout) {
            clearTimeout(ctrlCTimeout);
            ctrlCTimeout = null;
          }
        }
        continue;
      }

      // Reset Ctrl+C counter when user types a real command
      if (ctrlCCount > 0) {
        ctrlCCount = 0;
        if (ctrlCTimeout) {
          clearTimeout(ctrlCTimeout);
          ctrlCTimeout = null;
        }
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
        const context = {
          client,
          config,
          rl,
          contextManager,
          customCommands,
          settingsManager,
          themeManager,
          checkpointManager,
          mcpManager,
          vimMode
        };
        const shouldExit = await handleCommand(userInput, context);
        if (shouldExit) {
          break;
        }
        // Check if a custom command set a prompt to execute
        if (context.customCommandPrompt) {
          userInput = context.customCommandPrompt;
          delete context.customCommandPrompt;
          // Continue to process this as a normal prompt
        } else {
          continue;
        }
      }

      // Process prompt (handle @file, @image and !shell syntax)
      let { text: processedPrompt, images } = await processPrompt(userInput, config.yoloMode);

      // Add context to the prompt if available
      const contextText = contextManager.getCombinedContext();
      if (contextText) {
        processedPrompt = `${contextText}\n\n---\n\n${processedPrompt}`;
      }

      // Pause readline while showing spinner to avoid conflicts
      rl.pause();

      // Show thinking spinner
      const spinner = ora({
        text: 'Thinking...',
        color: 'cyan',
        stream: process.stderr, // Use stderr to avoid conflicts with stdout
      }).start();

      try {
        // Check if streaming is enabled
        if (config.stream) {
          spinner.text = 'Starting stream...';

          // Send streaming request
          const response = await client.chat(processedPrompt, {
            model: config.model,
            stream: true,
            images: images.length > 0 ? images : undefined,
          });

          spinner.stop();
          spinner.clear();

          // Display streaming response character by character
          console.log(chalk.blue.bold('\nAssistant > '));
          let fullResponse = '';

          for await (const chunk of response) {
            if (chunk.choices?.[0]?.delta?.content) {
              const text = chunk.choices[0].delta.content;

              // Stream character by character with slight delay for visual effect
              for (const char of text) {
                process.stdout.write(char);
                fullResponse += char;

                // Small delay to make streaming visible (1-2ms per character)
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }
          }

          console.log('\n');

          // Add to conversation history
          client.conversationHistory.push({ role: 'user', content: processedPrompt });
          client.conversationHistory.push({ role: 'assistant', content: fullResponse });
        } else {
          // Non-streaming mode with tools
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
        }
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
