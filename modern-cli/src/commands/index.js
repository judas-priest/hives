/**
 * Command Handler - Process slash commands
 */

import chalk from 'chalk';
import { getVersion } from '../utils/version.js';
import { saveSession, loadSession, listSessions, deleteSession, exportSession } from '../utils/session.js';
import { createDefaultHivesFile } from '../utils/context.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { fetchAndDisplay } from '../utils/web-fetch.js';
import { createDefaultSettings } from '../utils/settings.js';
import { createExampleCommands } from '../utils/custom-commands.js';
import { PROVIDERS, getProviderInfo } from '../lib/provider-factory.js';

/**
 * Handle slash commands
 * @returns {boolean} - true if should exit, false otherwise
 */
export async function handleCommand(input, context) {
  const { client, config, rl } = context;
  const parts = input.slice(1).split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'help':
      showHelp();
      return false;

    case 'exit':
    case 'quit':
      return true;

    case 'clear':
      console.clear();
      return false;

    case 'history':
      await handleHistoryCommand(args, context);
      return false;

    case 'version':
      showVersion();
      return false;

    case 'provider':
      handleProviderCommand(args, config);
      return false;

    case 'model':
      if (args.length > 0) {
        config.model = args.join(' ');
        console.log(chalk.green(`✓ Model changed to: ${config.model}\n`));
      } else {
        console.log(chalk.cyan(`Current model: ${config.model}\n`));
      }
      return false;

    case 'yolo':
      config.yoloMode = !config.yoloMode;
      console.log(
        config.yoloMode
          ? chalk.yellow('⚠️  YOLO Mode: ENABLED\n')
          : chalk.green('✓ YOLO Mode: DISABLED\n')
      );
      return false;

    case 'tools':
      showTools(config.yoloMode);
      return false;

    case 'save':
      handleSaveSession(client, config, args);
      return false;

    case 'load':
      handleLoadSession(client, config, args);
      return false;

    case 'sessions':
      listSessions();
      return false;

    case 'stream':
      config.stream = !config.stream;
      console.log(
        config.stream
          ? chalk.green('✓ Streaming: ENABLED\n')
          : chalk.gray('✓ Streaming: DISABLED\n')
      );
      return false;

    case 'reset':
      client.clearHistory();
      console.log(chalk.green('✓ Conversation history cleared\n'));
      return false;

    case 'init':
      await createDefaultHivesFile();
      return false;

    case 'copy':
      handleCopy(context);
      return false;

    case 'stats':
      showStats(client);
      return false;

    case 'fetch':
      await handleFetch(args);
      return false;

    case 'memory':
      await handleMemoryCommand(args, context);
      return false;

    case 'settings':
      await handleSettingsCommand(args, context);
      return false;

    case 'commands':
      if (context.customCommands) {
        context.customCommands.listCommands();
      } else {
        console.log(chalk.gray('\n  Custom commands not loaded.\n'));
      }
      return false;

    case 'examples':
      await createExampleCommands(args[0] || 'global');
      console.log(chalk.cyan('\n💡 Reload the CLI to use the example commands.\n'));
      return false;

    case 'export':
      handleExport(client, args);
      return false;

    case 'theme':
      await handleThemeCommand(args, context);
      return false;

    case 'restore':
      await handleRestoreCommand(args, context);
      return false;

    case 'checkpoint':
      await handleCheckpointCommand(args, context);
      return false;

    case 'mcp':
      await handleMCPCommand(args, context);
      return false;

    case 'vim':
      handleVimCommand(context);
      return false;

    case 'shell':
      await handleShellCommand(args, context);
      return false;

    case 'tui':
      handleTUICommand(context);
      return false;

    default:
      // Check if it's a custom command
      if (context.customCommands && context.customCommands.hasCommand(command)) {
        const prompt = await context.customCommands.executeCommand(command, args.join(' '));
        if (prompt) {
          // Return the prompt to be executed by the main loop
          context.customCommandPrompt = prompt;
          return false;
        }
      }

      console.log(chalk.red(`✗ Unknown command: ${command}`));
      console.log(chalk.gray('Type /help for available commands\n'));
      return false;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(chalk.cyan.bold('\n📚 Available Commands:\n'));

  const commands = [
    ['/help', 'Show this help message'],
    ['/exit', 'Exit the CLI'],
    ['/clear', 'Clear the screen'],
    ['/history [action]', 'Show/manage command history'],
    ['/reset', 'Clear conversation history'],
    ['/version', 'Show version information'],
    ['/provider [name]', 'Change or show current AI provider'],
    ['/model [name]', 'Change or show current AI model'],
    ['/yolo', 'Toggle YOLO mode (shell execution)'],
    ['/stream', 'Toggle streaming mode'],
    ['/tools', 'List available tools'],
    ['/save [name]', 'Save current session'],
    ['/load <name>', 'Load saved session'],
    ['/sessions', 'List all saved sessions'],
    ['/export <format>', 'Export session (markdown/json)'],
    ['/init', 'Create HIVES.md context file'],
    ['/copy', 'Copy last response to clipboard'],
    ['/stats', 'Show conversation statistics'],
    ['/fetch <url>', 'Fetch content from URL'],
    ['/memory <action>', 'Manage context memory'],
    ['/settings [action]', 'View/manage settings'],
    ['/commands', 'List custom commands'],
    ['/examples [scope]', 'Create example custom commands'],
    ['/theme [name]', 'Change or preview color theme'],
    ['/checkpoint [action]', 'Manage file checkpoints'],
    ['/restore <id>', 'Restore files from checkpoint'],
    ['/mcp [action]', 'Manage MCP servers and tools'],
    ['/vim', 'Toggle vim keybindings'],
    ['/shell [action]', 'Manage shell command settings'],
    ['/tui', 'Show TUI mode information'],
  ];

  for (const [cmd, desc] of commands) {
    console.log(`  ${chalk.green(cmd.padEnd(20))} ${chalk.gray(desc)}`);
  }

  console.log(chalk.cyan.bold('\n🎨 Special Syntax:\n'));

  console.log(`  ${chalk.green('@file.js'.padEnd(20))} ${chalk.gray('Include file in prompt')}`);
  console.log(`  ${chalk.green('@src/'.padEnd(20))} ${chalk.gray('Include directory listing')}`);

  console.log(chalk.cyan.bold('\n🐚 Bang Commands (Shell Execution):\n'));

  console.log(`  ${chalk.green('!pwd'.padEnd(20))} ${chalk.gray('Execute single shell command')}`);
  console.log(`  ${chalk.green('!git status'.padEnd(20))} ${chalk.gray('Run any shell command')}`);
  console.log(`  ${chalk.green('!'.padEnd(20))} ${chalk.gray('Toggle persistent shell mode')}`);
  console.log(chalk.dim(`    ${chalk.gray('Note: Dangerous commands require confirmation unless in YOLO mode')}`));

  console.log(chalk.cyan.bold('\n⌨️  Keyboard Shortcuts:\n'));

  console.log(`  ${chalk.green('Tab'.padEnd(20))} ${chalk.gray('Autocomplete commands, files, and history')}`);
  console.log(`  ${chalk.green('Ctrl+C'.padEnd(20))} ${chalk.gray('Cancel current input')}`);
  console.log(`  ${chalk.green('Ctrl+D'.padEnd(20))} ${chalk.gray('Exit CLI')}`);

  console.log(chalk.cyan.bold('\n💡 Features:\n'));

  console.log(`  ${chalk.green('Fuzzy Matching'.padEnd(20))} ${chalk.gray('Type partial text + Tab for smart completion')}`);
  console.log(`  ${chalk.green('History Search'.padEnd(20))} ${chalk.gray('Tab completes from your command history')}`);
  console.log(`  ${chalk.green('File Completion'.padEnd(20))} ${chalk.gray('Type @file + Tab to browse files')}`);

  console.log();
}

/**
 * Handle history command with subcommands
 */
async function handleHistoryCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'commands':
    case 'cmd':
      showCommandHistory(context);
      break;

    case 'conversation':
    case 'chat':
      showConversationHistory(context.client);
      break;

    case 'clear':
      await clearCommandHistory(context);
      break;

    case 'show':
      // Default to showing command history
      showCommandHistory(context);
      break;

    default:
      // Default: show command history (the main feature)
      showCommandHistory(context);
      break;
  }
}

/**
 * Show command history (user input commands)
 */
function showCommandHistory(context) {
  const { commandHistory } = context;

  if (!commandHistory || commandHistory.length === 0) {
    console.log(chalk.gray('\n  No command history yet.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n📜 Command History:\n'));

  // Show last 50 commands
  const recentHistory = commandHistory.slice(-50);
  const startIndex = Math.max(0, commandHistory.length - 50);

  recentHistory.forEach((cmd, index) => {
    const num = chalk.gray(`${(startIndex + index + 1).toString().padStart(4)}  `);
    console.log(`  ${num}${chalk.white(cmd)}`);
  });

  if (commandHistory.length > 50) {
    console.log(chalk.dim(`\n  ... and ${commandHistory.length - 50} more commands`));
  }

  console.log(chalk.dim(`\n  Total: ${commandHistory.length} commands`));
  console.log(chalk.dim(`  Location: ${context.historyManager?.getHistoryFile() || 'unknown'}`));
  console.log();
}

/**
 * Show conversation history (AI chat history)
 */
function showConversationHistory(client) {
  const history = client.getHistory();

  if (history.length === 0) {
    console.log(chalk.gray('\n  No conversation history yet.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n📜 Conversation History:\n'));

  for (const msg of history) {
    const role = msg.role === 'user' ? chalk.green('You') : chalk.blue('Assistant');
    const content = typeof msg.content === 'string'
      ? msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '')
      : '[Tool call]';
    console.log(`  ${role}: ${chalk.gray(content)}`);
  }

  console.log();
}

/**
 * Clear command history
 */
async function clearCommandHistory(context) {
  const { historyManager, commandHistory } = context;

  if (historyManager) {
    await historyManager.clearHistory();
    commandHistory.length = 0; // Clear in-memory array
    console.log(chalk.green('\n✓ Command history cleared\n'));
  } else {
    console.log(chalk.yellow('\n⚠️  History manager not available\n'));
  }
}

/**
 * Show conversation history (deprecated - kept for backward compatibility)
 */
function showHistory(client) {
  showConversationHistory(client);
}

/**
 * Show version information
 */
function showVersion() {
  console.log(chalk.cyan.bold('\n📦 Hives Modern CLI\n'));
  console.log(`  Version: ${chalk.green(getVersion())}`);
  console.log(`  Node: ${chalk.gray(process.version)}`);
  console.log(`  Platform: ${chalk.gray(process.platform)}`);
  console.log();
}

/**
 * Show available tools
 */
function showTools(yoloMode) {
  console.log(chalk.cyan.bold('\n🔧 Available Tools:\n'));

  const tools = [
    ['read_file', 'Read file contents'],
    ['write_file', 'Write content to file'],
    ['list_directory', 'List directory contents'],
    ['glob_files', 'Find files with glob patterns'],
    ['file_exists', 'Check if file exists'],
  ];

  if (yoloMode) {
    tools.push(['execute_shell', 'Execute shell commands (YOLO mode)']);
  }

  for (const [name, desc] of tools) {
    console.log(`  ${chalk.green(name.padEnd(20))} ${chalk.gray(desc)}`);
  }

  console.log();
}

/**
 * Handle save session command
 */
function handleSaveSession(client, config, args) {
  const name = args.length > 0 ? args.join('-') : `session-${Date.now()}`;
  const data = {
    model: config.model,
    conversationHistory: client.getHistory(),
    yoloMode: config.yoloMode,
  };
  saveSession(name, data);
}

/**
 * Handle load session command
 */
function handleLoadSession(client, config, args) {
  if (args.length === 0) {
    console.log(chalk.yellow('⚠️  Please provide a session name'));
    console.log(chalk.gray('Usage: /load <session-name>'));
    console.log(chalk.gray('Tip: Use /sessions to list all saved sessions\n'));
    return;
  }

  const name = args.join('-');
  const sessionData = loadSession(name);

  if (sessionData) {
    // Restore session data
    client.conversationHistory = sessionData.conversationHistory || [];
    config.model = sessionData.model;
    config.yoloMode = sessionData.metadata?.yoloMode || false;
    console.log();
  }
}

/**
 * Handle copy command
 */
function handleCopy(context) {
  const { client } = context;
  const history = client.getHistory();

  if (history.length === 0) {
    console.log(chalk.yellow('\n⚠️  No conversation history to copy\n'));
    return;
  }

  // Get the last assistant message
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant') {
      const content = typeof history[i].content === 'string'
        ? history[i].content
        : '[Tool call - cannot copy]';

      if (copyToClipboard(content)) {
        console.log(chalk.green('\n✓ Last response copied to clipboard\n'));
      }
      return;
    }
  }

  console.log(chalk.yellow('\n⚠️  No assistant messages found\n'));
}

/**
 * Show conversation statistics
 */
function showStats(client) {
  const history = client.getHistory();

  console.log(chalk.cyan.bold('\n📊 Conversation Statistics:\n'));

  let userMessages = 0;
  let assistantMessages = 0;
  let totalChars = 0;
  let totalTokensEstimate = 0;

  for (const msg of history) {
    if (msg.role === 'user') {
      userMessages++;
    } else if (msg.role === 'assistant') {
      assistantMessages++;
    }

    const content = typeof msg.content === 'string' ? msg.content : '';
    totalChars += content.length;
    // Rough estimate: ~4 chars per token
    totalTokensEstimate += Math.ceil(content.length / 4);
  }

  console.log(`  ${chalk.green('Total Messages:'.padEnd(25))} ${chalk.gray(history.length)}`);
  console.log(`  ${chalk.green('User Messages:'.padEnd(25))} ${chalk.gray(userMessages)}`);
  console.log(`  ${chalk.green('Assistant Messages:'.padEnd(25))} ${chalk.gray(assistantMessages)}`);
  console.log(`  ${chalk.green('Total Characters:'.padEnd(25))} ${chalk.gray(totalChars.toLocaleString())}`);
  console.log(`  ${chalk.green('Estimated Tokens:'.padEnd(25))} ${chalk.gray(totalTokensEstimate.toLocaleString())}`);
  console.log();
}

/**
 * Handle fetch command
 */
async function handleFetch(args) {
  if (args.length === 0) {
    console.log(chalk.yellow('\n⚠️  Please provide a URL'));
    console.log(chalk.gray('Usage: /fetch <url>\n'));
    return;
  }

  const url = args.join(' ');
  await fetchAndDisplay(url);
}

/**
 * Handle memory command
 */
async function handleMemoryCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.contextManager) {
    console.log(chalk.yellow('\n⚠️  Context manager not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'show':
      context.contextManager.showContextSummary();
      break;

    case 'refresh':
      await context.contextManager.loadContextFiles();
      await context.contextManager.loadCustomMemory();
      console.log(chalk.green('\n✓ Context refreshed\n'));
      break;

    case 'add':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide text to add'));
        console.log(chalk.gray('Usage: /memory add <text>\n'));
        return;
      }
      const text = args.slice(1).join(' ');
      context.contextManager.addMemory(text);
      console.log(chalk.green('\n✓ Memory added\n'));
      break;

    case 'list':
      context.contextManager.listContextPaths();
      break;

    default:
      console.log(chalk.cyan.bold('\n📝 Memory Commands:\n'));
      console.log(`  ${chalk.green('/memory show'.padEnd(25))} ${chalk.gray('Display loaded context')}`);
      console.log(`  ${chalk.green('/memory refresh'.padEnd(25))} ${chalk.gray('Reload all context files')}`);
      console.log(`  ${chalk.green('/memory add <text>'.padEnd(25))} ${chalk.gray('Add custom memory')}`);
      console.log(`  ${chalk.green('/memory list'.padEnd(25))} ${chalk.gray('List context file paths')}`);
      console.log();
  }
}

/**
 * Handle settings command
 */
async function handleSettingsCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.settingsManager) {
    console.log(chalk.yellow('\n⚠️  Settings manager not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'show':
    case undefined:
      context.settingsManager.showSettings();
      break;

    case 'set':
      if (args.length < 3) {
        console.log(chalk.yellow('\n⚠️  Usage: /settings set <key> <value> [scope]'));
        console.log(chalk.gray('Example: /settings set ui.theme dark global\n'));
        return;
      }
      const key = args[1];
      const value = args[2];
      const scope = args[3] || 'global';
      try {
        const parsedValue = JSON.parse(value);
        context.settingsManager.set(key, parsedValue, scope);
        await context.settingsManager.saveSettings(scope);
      } catch {
        context.settingsManager.set(key, value, scope);
        await context.settingsManager.saveSettings(scope);
      }
      break;

    case 'reset':
      const resetScope = args[1] || 'global';
      await context.settingsManager.resetSettings(resetScope);
      break;

    case 'export':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Usage: /settings export <file>\n'));
        return;
      }
      await context.settingsManager.exportSettings(args[1]);
      break;

    case 'import':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Usage: /settings import <file> [scope]\n'));
        return;
      }
      await context.settingsManager.importSettings(args[1], args[2] || 'global');
      break;

    case 'create':
      const createScope = args[1] || 'global';
      await createDefaultSettings(createScope);
      break;

    default:
      console.log(chalk.cyan.bold('\n⚙️  Settings Commands:\n'));
      console.log(`  ${chalk.green('/settings show'.padEnd(30))} ${chalk.gray('Show all settings')}`);
      console.log(`  ${chalk.green('/settings set <key> <val>'.padEnd(30))} ${chalk.gray('Set a setting value')}`);
      console.log(`  ${chalk.green('/settings reset [scope]'.padEnd(30))} ${chalk.gray('Reset to defaults')}`);
      console.log(`  ${chalk.green('/settings export <file>'.padEnd(30))} ${chalk.gray('Export settings')}`);
      console.log(`  ${chalk.green('/settings import <file>'.padEnd(30))} ${chalk.gray('Import settings')}`);
      console.log(`  ${chalk.green('/settings create [scope]'.padEnd(30))} ${chalk.gray('Create settings file')}`);
      console.log();
  }
}

/**
 * Handle export command
 */
function handleExport(client, args) {
  const format = args[0]?.toLowerCase() || 'markdown';
  const filename = args[1] || `session-${Date.now()}.${format === 'json' ? 'json' : 'md'}`;

  exportSession(client.getHistory(), filename, format);
}

/**
 * Handle theme command
 */
async function handleThemeCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.themeManager) {
    console.log(chalk.yellow('\n⚠️  Theme manager not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'list':
    case undefined:
      // List all available themes
      const themes = context.themeManager.getAllThemes();
      const currentTheme = context.themeManager.currentTheme;

      console.log(chalk.cyan.bold('\n🎨 Available Themes:\n'));

      for (const theme of themes) {
        const isCurrent = theme.id === currentTheme;
        const marker = isCurrent ? chalk.green('✓') : ' ';
        const customBadge = theme.custom ? chalk.gray(' [custom]') : '';
        console.log(`  ${marker} ${chalk.green(theme.name.padEnd(15))} ${chalk.gray(theme.description)}${customBadge}`);
      }

      console.log(chalk.cyan('\n💡 Usage:\n'));
      console.log(`  ${chalk.green('/theme <name>'.padEnd(25))} ${chalk.gray('Switch to theme')}`);
      console.log(`  ${chalk.green('/theme preview <name>'.padEnd(25))} ${chalk.gray('Preview a theme')}`);
      console.log(`  ${chalk.green('/theme list'.padEnd(25))} ${chalk.gray('List all themes')}`);
      console.log();
      break;

    case 'preview':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide a theme name'));
        console.log(chalk.gray('Usage: /theme preview <name>\n'));
        return;
      }
      const previewTheme = args[1];
      context.themeManager.previewTheme(previewTheme);
      break;

    default:
      // Set theme
      const themeName = subcommand;
      if (context.themeManager.setTheme(themeName)) {
        await context.themeManager.saveThemePreference(themeName);
        console.log(chalk.green(`\n✓ Theme changed to: ${themeName}\n`));
        console.log(chalk.gray('💡 Tip: Use /theme preview <name> to preview themes before switching\n'));
      } else {
        console.log(chalk.red(`\n✗ Theme '${themeName}' not found`));
        console.log(chalk.gray('Use /theme list to see available themes\n'));
      }
      break;
  }
}

/**
 * Handle restore command
 */
async function handleRestoreCommand(args, context) {
  if (!context.checkpointManager) {
    console.log(chalk.yellow('\n⚠️  Checkpoint manager not initialized\n'));
    return;
  }

  if (args.length === 0) {
    // Show available checkpoints
    context.checkpointManager.listCheckpoints();
    return;
  }

  const checkpointId = args[0];
  await context.checkpointManager.restoreCheckpoint(checkpointId);
}

/**
 * Handle checkpoint command
 */
async function handleCheckpointCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.checkpointManager) {
    console.log(chalk.yellow('\n⚠️  Checkpoint manager not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'list':
    case undefined:
      context.checkpointManager.listCheckpoints();
      break;

    case 'show':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide a checkpoint ID'));
        console.log(chalk.gray('Usage: /checkpoint show <id>\n'));
        return;
      }
      await context.checkpointManager.showCheckpoint(args[1]);
      break;

    case 'clean':
      const days = args[1] ? parseInt(args[1]) : 30;
      await context.checkpointManager.cleanCheckpoints(days);
      break;

    case 'stats':
      const stats = context.checkpointManager.getStats();
      console.log(chalk.cyan.bold('\n📊 Checkpoint Statistics:\n'));

      if (!stats.enabled) {
        console.log(chalk.yellow('  Checkpointing is disabled'));
        console.log(chalk.gray('  Enable it in settings: /settings set checkpointing.enabled true\n'));
      } else {
        console.log(`  ${chalk.green('Enabled:')} ${stats.enabled ? 'Yes' : 'No'}`);
        console.log(`  ${chalk.green('Total Checkpoints:')} ${stats.count}`);
        if (stats.oldestTimestamp) {
          console.log(`  ${chalk.green('Oldest:')} ${new Date(stats.oldestTimestamp).toLocaleString()}`);
        }
        if (stats.newestTimestamp) {
          console.log(`  ${chalk.green('Newest:')} ${new Date(stats.newestTimestamp).toLocaleString()}`);
        }
        console.log(`  ${chalk.green('Storage:')} ${stats.shadowRepoPath}\n`);
      }
      break;

    case 'enable':
      await context.settingsManager.set('checkpointing.enabled', true);
      await context.settingsManager.saveSettings();
      await context.checkpointManager.initialize();
      console.log(chalk.green('\n✓ Checkpointing enabled\n'));
      break;

    case 'disable':
      await context.settingsManager.set('checkpointing.enabled', false);
      await context.settingsManager.saveSettings();
      context.checkpointManager.enabled = false;
      console.log(chalk.green('\n✓ Checkpointing disabled\n'));
      break;

    default:
      console.log(chalk.cyan.bold('\n📦 Checkpoint Commands:\n'));
      console.log(`  ${chalk.green('/checkpoint list'.padEnd(30))} ${chalk.gray('List all checkpoints')}`);
      console.log(`  ${chalk.green('/checkpoint show <id>'.padEnd(30))} ${chalk.gray('Show checkpoint details')}`);
      console.log(`  ${chalk.green('/checkpoint stats'.padEnd(30))} ${chalk.gray('Show checkpoint statistics')}`);
      console.log(`  ${chalk.green('/checkpoint clean [days]'.padEnd(30))} ${chalk.gray('Clean old checkpoints')}`);
      console.log(`  ${chalk.green('/checkpoint enable'.padEnd(30))} ${chalk.gray('Enable checkpointing')}`);
      console.log(`  ${chalk.green('/checkpoint disable'.padEnd(30))} ${chalk.gray('Disable checkpointing')}`);
      console.log(`  ${chalk.green('/restore <id>'.padEnd(30))} ${chalk.gray('Restore from checkpoint')}`);
      console.log();
  }
}

/**
 * Handle MCP command
 */
async function handleMCPCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.mcpManager) {
    console.log(chalk.yellow('\n⚠️  MCP manager not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'list':
    case undefined:
      context.mcpManager.listServers();
      break;

    case 'tools':
      context.mcpManager.listTools();
      break;

    case 'desc':
    case 'descriptions':
      context.mcpManager.showToolDescriptions();
      break;

    case 'schema':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide a tool ID'));
        console.log(chalk.gray('Usage: /mcp schema <server:tool>\n'));
        return;
      }
      context.mcpManager.showToolSchema(args[1]);
      break;

    case 'refresh':
    case 'restart':
      if (args.length < 2) {
        // Restart all servers
        console.log(chalk.cyan('\n🔄 Restarting all MCP servers...\n'));
        const servers = Array.from(context.mcpManager.servers.keys());
        for (const name of servers) {
          await context.mcpManager.restartServer(name);
        }
        console.log(chalk.green('✓ All servers restarted\n'));
      } else {
        // Restart specific server
        const serverName = args[1];
        console.log(chalk.cyan(`\n🔄 Restarting ${serverName}...\n`));
        await context.mcpManager.restartServer(serverName);
        console.log(chalk.green(`✓ ${serverName} restarted\n`));
      }
      break;

    case 'stop':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide a server name'));
        console.log(chalk.gray('Usage: /mcp stop <server-name>\n'));
        return;
      }
      const serverToStop = args[1];
      if (await context.mcpManager.stopServer(serverToStop)) {
        console.log(chalk.green(`\n✓ Stopped ${serverToStop}\n`));
      } else {
        console.log(chalk.red(`\n✗ Server '${serverToStop}' not running\n`));
      }
      break;

    case 'start':
      if (args.length < 2) {
        console.log(chalk.yellow('\n⚠️  Please provide a server name'));
        console.log(chalk.gray('Usage: /mcp start <server-name>\n'));
        return;
      }
      const serverToStart = args[1];
      const config = context.mcpManager.serverConfigs[serverToStart];
      if (config) {
        console.log(chalk.cyan(`\n🔄 Starting ${serverToStart}...\n`));
        await context.mcpManager.startServer(serverToStart, config);
      } else {
        console.log(chalk.red(`\n✗ Server '${serverToStart}' not configured\n`));
      }
      break;

    case 'stats':
      const stats = context.mcpManager.getStats();
      console.log(chalk.cyan.bold('\n📊 MCP Statistics:\n'));
      console.log(`  ${chalk.green('Configured Servers:')} ${stats.configuredServers}`);
      console.log(`  ${chalk.green('Running Servers:')} ${stats.runningServers}`);
      console.log(`  ${chalk.green('Available Tools:')} ${stats.availableTools}`);
      console.log();
      break;

    default:
      console.log(chalk.cyan.bold('\n🔌 MCP Commands:\n'));
      console.log(`  ${chalk.green('/mcp list'.padEnd(30))} ${chalk.gray('List all MCP servers')}`);
      console.log(`  ${chalk.green('/mcp tools'.padEnd(30))} ${chalk.gray('List available tools')}`);
      console.log(`  ${chalk.green('/mcp desc'.padEnd(30))} ${chalk.gray('Show tool descriptions')}`);
      console.log(`  ${chalk.green('/mcp schema <tool>'.padEnd(30))} ${chalk.gray('Show tool schema')}`);
      console.log(`  ${chalk.green('/mcp start <server>'.padEnd(30))} ${chalk.gray('Start MCP server')}`);
      console.log(`  ${chalk.green('/mcp stop <server>'.padEnd(30))} ${chalk.gray('Stop MCP server')}`);
      console.log(`  ${chalk.green('/mcp refresh [server]'.padEnd(30))} ${chalk.gray('Restart server(s)')}`);
      console.log(`  ${chalk.green('/mcp stats'.padEnd(30))} ${chalk.gray('Show MCP statistics')}`);
      console.log();
  }
}

/**
 * Handle vim command
 */
function handleVimCommand(context) {
  if (!context.vimMode) {
    console.log(chalk.yellow('\n⚠️  Vim mode not initialized\n'));
    return;
  }

  context.vimMode.toggle();
}

/**
 * Handle TUI command
 */
function handleTUICommand(context) {
  console.log(chalk.cyan('\n📺 Switching to TUI mode...\n'));
  console.log(chalk.gray('To start in TUI mode, run: ') + chalk.white('node src/index.js --tui\n'));
  console.log(chalk.yellow('⚠️  TUI mode cannot be toggled from within interactive mode.'));
  console.log(chalk.yellow('   Please restart the CLI with the --tui flag.\n'));
}

/**
 * Handle shell command
 */
async function handleShellCommand(args, context) {
  const subcommand = args[0]?.toLowerCase();

  if (!context.bangShell) {
    console.log(chalk.yellow('\n⚠️  Shell mode not initialized\n'));
    return;
  }

  switch (subcommand) {
    case 'status':
    case undefined:
      showShellStatus(context);
      break;

    case 'history':
      showShellHistory(context);
      break;

    case 'clear':
      context.bangShell.clearHistory();
      console.log(chalk.green('\n✓ Shell command history cleared\n'));
      break;

    case 'yolo':
      const newYoloMode = !context.bangShell.yoloMode;
      context.bangShell.yoloMode = newYoloMode;
      context.settingsManager.set('shell.yoloMode', newYoloMode);
      await context.settingsManager.saveSettings();
      console.log(
        newYoloMode
          ? chalk.yellow('\n⚠️  Shell YOLO Mode: ENABLED (no confirmations)\n')
          : chalk.green('\n✓ Shell YOLO Mode: DISABLED (confirmations enabled)\n')
      );
      break;

    case 'dangerous':
      const dangerousList = context.settingsManager.get('shell.dangerousCommands');
      console.log(chalk.cyan.bold('\n⚠️  Dangerous Commands List:\n'));
      dangerousList.forEach((cmd, index) => {
        console.log(`  ${chalk.gray((index + 1).toString().padStart(2))}. ${chalk.yellow(cmd)}`);
      });
      console.log(chalk.dim('\n  These commands require confirmation unless YOLO mode is enabled'));
      console.log(chalk.gray('  Edit settings.json to customize this list\n'));
      break;

    default:
      console.log(chalk.cyan.bold('\n🐚 Shell Commands:\n'));
      console.log(`  ${chalk.green('/shell status'.padEnd(30))} ${chalk.gray('Show shell mode status')}`);
      console.log(`  ${chalk.green('/shell history'.padEnd(30))} ${chalk.gray('Show shell command history')}`);
      console.log(`  ${chalk.green('/shell clear'.padEnd(30))} ${chalk.gray('Clear shell history')}`);
      console.log(`  ${chalk.green('/shell yolo'.padEnd(30))} ${chalk.gray('Toggle YOLO mode (auto-approve)')}`);
      console.log(`  ${chalk.green('/shell dangerous'.padEnd(30))} ${chalk.gray('List dangerous commands')}`);
      console.log();
      console.log(chalk.cyan.bold('💡 Usage Examples:\n'));
      console.log(`  ${chalk.green('!pwd'.padEnd(30))} ${chalk.gray('Execute single command')}`);
      console.log(`  ${chalk.green('!git status'.padEnd(30))} ${chalk.gray('Any shell command')}`);
      console.log(`  ${chalk.green('!'.padEnd(30))} ${chalk.gray('Toggle persistent shell mode')}`);
      console.log();
  }
}

/**
 * Show shell status
 */
function showShellStatus(context) {
  const { bangShell, settingsManager } = context;
  const shellSettings = settingsManager.get('shell');

  console.log(chalk.cyan.bold('\n🐚 Shell Mode Status:\n'));
  console.log(`  ${chalk.green('Persistent Mode:'.padEnd(25))} ${bangShell.isActive() ? chalk.yellow('ACTIVE') : chalk.gray('Inactive')}`);
  console.log(`  ${chalk.green('YOLO Mode:'.padEnd(25))} ${bangShell.yoloMode ? chalk.yellow('ENABLED') : chalk.gray('Disabled')}`);
  console.log(`  ${chalk.green('Confirm Dangerous:'.padEnd(25))} ${shellSettings.confirmDangerous ? chalk.green('Yes') : chalk.red('No')}`);
  console.log(`  ${chalk.green('Timeout:'.padEnd(25))} ${chalk.gray(shellSettings.timeout + 'ms')}`);
  console.log(`  ${chalk.green('Max Buffer:'.padEnd(25))} ${chalk.gray((shellSettings.maxBuffer / 1024 / 1024).toFixed(1) + 'MB')}`);
  console.log(`  ${chalk.green('Command History:'.padEnd(25))} ${chalk.gray(bangShell.getHistory().length + ' commands')}`);
  console.log();

  if (bangShell.yoloMode) {
    console.log(chalk.yellow('⚠️  Warning: YOLO mode is enabled - all commands will be auto-approved!'));
    console.log();
  }
}

/**
 * Show shell history
 */
function showShellHistory(context) {
  const history = context.bangShell.getHistory();

  if (history.length === 0) {
    console.log(chalk.gray('\n  No shell commands executed yet.\n'));
    return;
  }

  console.log(chalk.cyan.bold('\n📜 Shell Command History:\n'));

  history.slice(-20).forEach((entry, index) => {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`  ${chalk.gray(timestamp)} ${chalk.cyan('$')} ${chalk.white(entry.command)}`);
  });

  if (history.length > 20) {
    console.log(chalk.dim(`\n  ... and ${history.length - 20} more commands`));
  }

  console.log();
}

/**
 * Handle provider command
 */
function handleProviderCommand(args, config) {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'list':
    case undefined:
      // List all available providers
      console.log(chalk.cyan.bold('\n🔌 Available AI Providers:\n'));

      const providers = [
        { id: PROVIDERS.POLZA, name: 'Polza AI', current: config.provider === PROVIDERS.POLZA },
        { id: PROVIDERS.KODACODE, name: 'Kodacode', current: config.provider === PROVIDERS.KODACODE },
      ];

      for (const provider of providers) {
        const marker = provider.current ? chalk.green('✓') : ' ';
        const info = getProviderInfo(provider.id);
        console.log(`  ${marker} ${chalk.green(provider.name.padEnd(15))} ${chalk.gray(info.description)}`);
        console.log(`     ${chalk.dim('Auth:')} ${chalk.gray(info.authType.padEnd(15))} ${chalk.dim('Default Model:')} ${chalk.gray(info.defaultModel)}`);
      }

      console.log(chalk.cyan('\n💡 Note:\n'));
      console.log(chalk.gray('  Provider switching requires restarting the CLI with appropriate credentials.'));
      console.log(chalk.gray('  Set AI_PROVIDER environment variable to change the default provider.'));
      console.log();
      break;

    case 'models':
      // Show models for a specific provider or current provider
      const targetProvider = args[1] || config.provider;
      const info = getProviderInfo(targetProvider);

      if (!info) {
        console.log(chalk.red(`\n✗ Provider '${targetProvider}' not found\n`));
        return;
      }

      console.log(chalk.cyan.bold(`\n🤖 ${info.name} - Available Models:\n`));
      for (const model of info.supportedModels) {
        const isCurrent = model === config.model;
        const marker = isCurrent ? chalk.green('✓') : ' ';
        console.log(`  ${marker} ${chalk.green(model)}`);
      }
      console.log();
      break;

    case 'info':
      // Show detailed info about a provider
      const providerName = args[1] || config.provider;
      const providerInfo = getProviderInfo(providerName);

      if (!providerInfo) {
        console.log(chalk.red(`\n✗ Provider '${providerName}' not found\n`));
        return;
      }

      console.log(chalk.cyan.bold(`\n🔌 ${providerInfo.name} - Provider Information:\n`));
      console.log(`  ${chalk.green('Website:'.padEnd(20))} ${chalk.gray(providerInfo.website)}`);
      console.log(`  ${chalk.green('Description:'.padEnd(20))} ${chalk.gray(providerInfo.description)}`);
      console.log(`  ${chalk.green('Authentication:'.padEnd(20))} ${chalk.gray(providerInfo.authType)}`);
      console.log(`  ${chalk.green('Default Model:'.padEnd(20))} ${chalk.gray(providerInfo.defaultModel)}`);
      console.log(`  ${chalk.green('Total Models:'.padEnd(20))} ${chalk.gray(providerInfo.supportedModels.length)}`);
      console.log();
      break;

    default:
      console.log(chalk.cyan.bold('\n🔌 Provider Commands:\n'));
      console.log(`  ${chalk.green('/provider list'.padEnd(30))} ${chalk.gray('List all providers')}`);
      console.log(`  ${chalk.green('/provider models [name]'.padEnd(30))} ${chalk.gray('List provider models')}`);
      console.log(`  ${chalk.green('/provider info [name]'.padEnd(30))} ${chalk.gray('Show provider details')}`);
      console.log();
      console.log(chalk.cyan.bold('📝 Current Configuration:\n'));
      console.log(`  ${chalk.green('Provider:'.padEnd(20))} ${chalk.cyan(config.provider)}`);
      console.log(`  ${chalk.green('Model:'.padEnd(20))} ${chalk.cyan(config.model)}`);
      console.log();
      console.log(chalk.yellow('⚠️  To switch providers:\n'));
      console.log(chalk.gray('  1. Set AI_PROVIDER environment variable (polza or kodacode)'));
      console.log(chalk.gray('  2. Ensure appropriate credentials are set (POLZA_API_KEY or GITHUB_TOKEN)'));
      console.log(chalk.gray('  3. Restart the CLI'));
      console.log();
      break;
  }
}
