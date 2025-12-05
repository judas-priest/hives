/**
 * TUI Mode - Full-screen Terminal User Interface
 *
 * Provides a rich, full-screen interface with:
 * - Split-panel layout (conversation history + input area)
 * - Visual conversation display
 * - Status bar with model info
 * - Keyboard shortcuts
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { createClient, getProviderInfo } from './lib/provider-factory.js';
import { getTools, getToolHandlers } from './lib/tools.js';
import { processPrompt } from './utils/prompt-processor.js';
import { ContextManager } from './utils/context.js';

/**
 * Start TUI mode
 */
export async function startTUI(config) {
  // Create screen
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Hives Modern CLI - TUI Mode',
    fullUnicode: true,
  });

  // Create grid layout
  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen: screen
  });

  // Create conversation log (top 80% of screen)
  const conversationLog = grid.set(0, 0, 9, 12, blessed.log, {
    label: ' Conversation ',
    tags: true,
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
      label: { fg: 'cyan' }
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '█',
      track: {
        bg: 'grey'
      },
      style: {
        inverse: true
      }
    },
    mouse: true,
    keys: true,
    vi: true
  });

  // Create input box (bottom section, above status)
  const inputBox = grid.set(9, 0, 2, 12, blessed.textarea, {
    label: ' Input (Press Enter to send, Ctrl+C to exit TUI) ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'green' },
      label: { fg: 'green' },
      focus: {
        bg: 'black',
        border: { fg: 'brightgreen' }
      }
    },
    inputOnFocus: true,
    keys: true,
    mouse: true
  });

  // Create status bar (bottom line)
  const statusBar = grid.set(11, 0, 1, 12, blessed.box, {
    content: '',
    style: {
      fg: 'white',
      bg: 'blue'
    }
  });

  // Initialize AI client
  const client = createClient(config);

  // Initialize context manager
  const contextManager = new ContextManager();
  await contextManager.loadContextFiles();
  await contextManager.loadCustomMemory();

  // Get tools
  const tools = getTools(config.yoloMode);
  const toolHandlers = getToolHandlers(config.yoloMode);

  // Update status bar
  const providerInfo = getProviderInfo(config.provider);
  const statusText = ` Provider: ${providerInfo ? providerInfo.name : config.provider} | Model: ${config.model} | ${config.yoloMode ? '⚠️  YOLO' : '✓ Safe'} | Press Ctrl+C to exit TUI `;
  statusBar.setContent(statusText);

  // Add welcome message
  conversationLog.log('{cyan-fg}{bold}Welcome to Hives Modern CLI - TUI Mode{/bold}{/cyan-fg}');
  conversationLog.log('{gray-fg}═══════════════════════════════════════════════════════════{/gray-fg}');
  conversationLog.log('');
  conversationLog.log('{green-fg}✓{/green-fg} Type your message and press Enter to send');
  conversationLog.log('{green-fg}✓{/green-fg} Use @file.txt to include files');
  conversationLog.log('{green-fg}✓{/green-fg} Use !command for shell execution (if YOLO mode)');
  conversationLog.log('{green-fg}✓{/green-fg} Press Ctrl+C to exit TUI mode');
  conversationLog.log('');

  if (contextManager.contexts.length > 0) {
    conversationLog.log(`{cyan-fg}📝 Context:{/cyan-fg} {gray-fg}${contextManager.contexts.length} files loaded{/gray-fg}`);
    conversationLog.log('');
  }

  // Focus on input
  inputBox.focus();

  // Handle input submission
  inputBox.on('submit', async (value) => {
    const userInput = value.trim();

    if (!userInput) {
      inputBox.clearValue();
      screen.render();
      return;
    }

    // Display user message
    conversationLog.log('');
    conversationLog.log(`{green-fg}{bold}You >{/bold}{/green-fg} ${userInput}`);
    conversationLog.log('');

    // Clear input
    inputBox.clearValue();
    inputBox.focus();
    screen.render();

    try {
      // Show thinking indicator
      statusBar.setContent(` ${statusText.trim()} | 🤔 Thinking... `);
      screen.render();

      // Process prompt
      let { text: processedPrompt, images } = await processPrompt(userInput, config.yoloMode);

      // Add context
      const contextText = contextManager.getCombinedContext();
      if (contextText) {
        processedPrompt = `${contextText}\n\n---\n\n${processedPrompt}`;
      }

      // Send to AI
      const response = await client.chatWithTools(processedPrompt, {
        model: config.model,
        tools,
        toolHandlers,
        images: images.length > 0 ? images : undefined,
      });

      // Display assistant response
      const assistantMessage = response.choices[0].message.content;
      conversationLog.log(`{blue-fg}{bold}Assistant >{/bold}{/blue-fg}`);
      conversationLog.log('');

      // Split response into lines for better display
      const lines = assistantMessage.split('\n');
      for (const line of lines) {
        conversationLog.log(line);
      }
      conversationLog.log('');

      // Restore status
      statusBar.setContent(statusText);
      screen.render();

    } catch (error) {
      conversationLog.log('');
      conversationLog.log(`{red-fg}{bold}✗ Error:{/bold} ${error.message}{/red-fg}`);
      conversationLog.log('');

      // Restore status
      statusBar.setContent(statusText);
      screen.render();
    }
  });

  // Handle Ctrl+C - exit TUI
  screen.key(['C-c'], () => {
    conversationLog.log('');
    conversationLog.log('{cyan-fg}Exiting TUI mode...{/cyan-fg}');
    screen.render();
    setTimeout(() => {
      screen.destroy();
      process.exit(0);
    }, 500);
  });

  // Handle escape - alternative exit
  screen.key(['escape'], () => {
    conversationLog.log('');
    conversationLog.log('{cyan-fg}Exiting TUI mode...{/cyan-fg}');
    screen.render();
    setTimeout(() => {
      screen.destroy();
      process.exit(0);
    }, 500);
  });

  // Handle mouse scroll on conversation log
  conversationLog.on('wheeldown', () => {
    conversationLog.scroll(3);
    screen.render();
  });

  conversationLog.on('wheelup', () => {
    conversationLog.scroll(-3);
    screen.render();
  });

  // Render screen
  screen.render();
}
