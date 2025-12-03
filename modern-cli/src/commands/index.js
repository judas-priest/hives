/**
 * Command Handler - Process slash commands
 */

import chalk from 'chalk';
import { getVersion } from '../utils/version.js';
import { saveSession, loadSession, listSessions, deleteSession } from '../utils/session.js';

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
      showHistory(client);
      return false;

    case 'version':
      showVersion();
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

    default:
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
    ['/history', 'Show conversation history'],
    ['/reset', 'Clear conversation history'],
    ['/version', 'Show version information'],
    ['/model [name]', 'Change or show current AI model'],
    ['/yolo', 'Toggle YOLO mode (shell execution)'],
    ['/stream', 'Toggle streaming mode'],
    ['/tools', 'List available tools'],
    ['/save [name]', 'Save current session'],
    ['/load <name>', 'Load saved session'],
    ['/sessions', 'List all saved sessions'],
  ];

  for (const [cmd, desc] of commands) {
    console.log(`  ${chalk.green(cmd.padEnd(20))} ${chalk.gray(desc)}`);
  }

  console.log(chalk.cyan.bold('\n🎨 Special Syntax:\n'));

  console.log(`  ${chalk.green('@file.js'.padEnd(20))} ${chalk.gray('Include file in prompt')}`);
  console.log(`  ${chalk.green('@src/'.padEnd(20))} ${chalk.gray('Include directory listing')}`);
  console.log(`  ${chalk.green('!ls -la'.padEnd(20))} ${chalk.gray('Execute shell command (YOLO mode)')}`);

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
 * Show conversation history
 */
function showHistory(client) {
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
