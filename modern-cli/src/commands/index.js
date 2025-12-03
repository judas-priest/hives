/**
 * Command Handler - Process slash commands
 */

import chalk from 'chalk';
import { getVersion } from '../utils/version.js';

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
    ['/version', 'Show version information'],
    ['/model [name]', 'Change or show current AI model'],
    ['/yolo', 'Toggle YOLO mode (shell execution)'],
    ['/tools', 'List available tools'],
  ];

  for (const [cmd, desc] of commands) {
    console.log(`  ${chalk.green(cmd.padEnd(20))} ${chalk.gray(desc)}`);
  }

  console.log(chalk.cyan.bold('\n🎨 Special Syntax:\n'));

  console.log(`  ${chalk.green('@file.js'.padEnd(20))} ${chalk.gray('Include file in prompt')}`);
  console.log(`  ${chalk.green('@src/'.padEnd(20))} ${chalk.gray('Include directory listing')}`);
  console.log(`  ${chalk.green('!ls -la'.padEnd(20))} ${chalk.gray('Execute shell command (YOLO mode)')}`);

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
