/**
 * Interactive Mode - Main chat interface
 */

import { stdin as input, stdout as output } from 'process';
import chalk from 'chalk';
import ora from 'ora';
import { createClient, PROVIDERS, getProviderInfo } from './lib/provider-factory.js';
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
import { BangShellMode, parseBangCommand, executeShellCommand } from './utils/bang-shell.js';
import { HistoryManager } from './lib/history-manager.js';
import { getInteractivePrompt } from './utils/prompts.js';

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

  // Initialize history manager
  const historyManager = new HistoryManager();

  // Initialize AI client using provider factory
  const client = createClient(config);

  // Initialize context manager and load context files
  const contextManager = new ContextManager();
  await contextManager.loadContextFiles();
  await contextManager.loadCustomMemory();

  // Set system prompt for AI behavior
  const customMemoryText = contextManager.customMemory
    .map(m => m.text || m)
    .join('\n');
  const systemPrompt = getInteractivePrompt(config.yoloMode, customMemoryText);
  client.setSystemPrompt(systemPrompt);

  // Initialize custom commands manager
  const customCommands = new CustomCommandsManager();
  await customCommands.loadCommands();

  // Get tools and handlers
  const tools = getTools(config.yoloMode);
  const toolHandlers = getToolHandlers(config.yoloMode);

  // Command history for fuzzy search - load from disk
  const commandHistory = await historyManager.loadHistory();

  // Create completer with history access
  const completer = createCompleter(() => commandHistory);

  // Create enhanced readline interface with visual autocomplete
  // Pass history array to enable up/down arrow navigation
  const rl = createEnhancedReadline({
    input,
    output,
    completer,
    terminal: true,
    history: commandHistory,
    historySize: 1000,
  });

  // Initialize vim mode
  const vimMode = new VimMode(rl, settingsManager);
  await vimMode.initialize();

  // Initialize bang-shell mode
  const shellSettings = settingsManager.get('shell');
  const bangShell = new BangShellMode({
    yoloMode: config.yoloMode || shellSettings.yoloMode,
    dangerousList: shellSettings.dangerousCommands,
  });

  // Track shell command history for AI context
  const shellCommandHistory = [];

  // Promisify the question method
  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  // Show provider and model info
  const providerInfo = getProviderInfo(config.provider);
  console.log(chalk.gray('  Provider: ') + chalk.cyan(providerInfo ? providerInfo.name : config.provider));
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
  console.log(chalk.gray('  💡 Tip: ') + chalk.dim('Use !command to run shell commands, ! to toggle shell mode'));
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
      // Use different prompt for shell mode
      const promptText = bangShell.isActive()
        ? chalk.yellow.bold('Shell > ')
        : chalk.green.bold('You > ');
      const userInput = await question(promptText);

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
        // Save to disk asynchronously (don't wait)
        historyManager.appendToHistory(userInput.trim()).catch(() => {
          // Silent fail for history save errors
        });
        // Keep history size manageable
        if (commandHistory.length > 1000) {
          commandHistory.shift();
        }
      }

      // Handle persistent shell mode
      if (bangShell.isActive()) {
        // Check for shell mode toggle (exit)
        if (userInput.trim() === '!') {
          bangShell.toggle();
          continue;
        }

        // Execute command in shell mode
        if (userInput.trim()) {
          const result = await bangShell.executeInMode(userInput.trim());
          if (result && !result.cancelled) {
            // Add to shell history for AI context
            const contextEntry = bangShell.formatForContext(userInput.trim(), result);
            shellCommandHistory.push(contextEntry);
          }
        }
        continue;
      }

      // Handle bang-commands (when not in persistent shell mode)
      const bangCommand = parseBangCommand(userInput);
      if (bangCommand) {
        if (bangCommand.type === 'toggle-shell-mode') {
          bangShell.toggle();
          continue;
        } else if (bangCommand.type === 'single-command') {
          const result = await executeShellCommand(bangCommand.command, {
            yoloMode: config.yoloMode || shellSettings.yoloMode,
            dangerousList: shellSettings.dangerousCommands,
            timeout: shellSettings.timeout,
            maxBuffer: shellSettings.maxBuffer,
          });

          if (result && !result.cancelled) {
            // Add to shell history for AI context
            const contextEntry = bangShell.formatForContext(bangCommand.command, result);
            shellCommandHistory.push(contextEntry);

            // Add result to conversation context so AI can see it
            const contextText = `\n\nPrevious shell command executed:\n${contextEntry}`;
            client.conversationHistory.push({
              role: 'system',
              content: contextText,
            });
          }
          continue;
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
          vimMode,
          bangShell,
          shellCommandHistory,
          historyManager,
          commandHistory
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

          // After streaming completes
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
          console.log('\n');
          const assistantMessage = response.choices[0].message.content;
          console.log(chalk.blue.bold('Assistant > '));
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
