/**
 * Bang-Shell System - Execute shell commands with ! prefix
 * Inspired by Google Gemini CLI
 *
 * Features:
 * - Single command execution: !pwd, !git status
 * - Persistent shell mode: ! (toggle in/out)
 * - Security confirmations for dangerous commands
 * - Command output integration with AI context
 */

import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import { stdin as input, stdout as output } from 'process';
import readline from 'readline';

/**
 * Default dangerous commands that require confirmation
 */
const DEFAULT_DANGEROUS_COMMANDS = [
  'rm', 'rmdir', 'del', 'delete',
  'chmod', 'chown', 'chgrp',
  'mv', 'move',
  'dd', 'format', 'mkfs',
  'kill', 'killall', 'pkill',
  'shutdown', 'reboot', 'halt', 'poweroff',
  'sudo', 'su',
  'apt', 'yum', 'dnf', 'pacman', 'brew', 'npm', 'pip', 'gem',
];

/**
 * Check if a command is potentially dangerous
 */
function isDangerousCommand(command, dangerousList) {
  const firstWord = command.trim().split(/\s+/)[0];
  const baseCommand = firstWord.replace(/^sudo\s+/, '');

  return dangerousList.some(dangerous =>
    baseCommand === dangerous ||
    baseCommand.startsWith(dangerous + ' ') ||
    command.includes('*') || // Wildcards
    command.includes('>') ||  // Redirects
    command.includes('|')     // Pipes can be dangerous
  );
}

/**
 * Prompt user for confirmation
 */
async function confirmCommand(command) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });

    console.log(chalk.yellow(`\n⚠️  Potentially dangerous command:`));
    console.log(chalk.gray(`   ${command}`));

    rl.question(chalk.yellow('Execute this command? [y/N] '), (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
      resolve(confirmed);
    });
  });
}

/**
 * Execute a shell command and return result
 */
export async function executeShellCommand(command, options = {}) {
  const {
    yoloMode = false,
    dangerousList = DEFAULT_DANGEROUS_COMMANDS,
    timeout = 30000,
    maxBuffer = 5 * 1024 * 1024, // 5MB
  } = options;

  // Check if command is dangerous and needs confirmation
  if (!yoloMode && isDangerousCommand(command, dangerousList)) {
    const confirmed = await confirmCommand(command);
    if (!confirmed) {
      return {
        success: false,
        stdout: '',
        stderr: 'Command cancelled by user',
        exitCode: 130,
        cancelled: true,
      };
    }
  }

  // Execute the command
  try {
    console.log(chalk.cyan(`\n🔧 Executing: ${chalk.bold(command)}`));

    const stdout = execSync(command, {
      encoding: 'utf-8',
      timeout,
      maxBuffer,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    console.log(chalk.green('✓ Command completed successfully\n'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(stdout);
    console.log(chalk.gray('─'.repeat(60)));

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: '',
      exitCode: 0,
    };
  } catch (error) {
    const stderr = error.stderr?.toString() || error.message;
    const exitCode = error.status || 1;

    console.log(chalk.red(`✗ Command failed (exit code ${exitCode})\n`));
    console.log(chalk.gray('─'.repeat(60)));
    if (error.stdout) {
      console.log(chalk.yellow('stdout:'));
      console.log(error.stdout.toString());
    }
    if (stderr) {
      console.log(chalk.red('stderr:'));
      console.log(stderr);
    }
    console.log(chalk.gray('─'.repeat(60)));

    return {
      success: false,
      stdout: error.stdout?.toString() || '',
      stderr,
      exitCode,
    };
  }
}

/**
 * BangShellMode - Persistent shell mode manager
 */
export class BangShellMode {
  constructor(options = {}) {
    this.yoloMode = options.yoloMode || false;
    this.dangerousList = options.dangerousList || DEFAULT_DANGEROUS_COMMANDS;
    this.active = false;
    this.commandHistory = [];
  }

  /**
   * Check if shell mode is active
   */
  isActive() {
    return this.active;
  }

  /**
   * Toggle shell mode
   */
  toggle() {
    this.active = !this.active;

    if (this.active) {
      console.log(chalk.cyan.bold('\n🐚 Entering Persistent Shell Mode'));
      console.log(chalk.gray('  Every line will be executed as a shell command'));
      console.log(chalk.gray('  Type ! again to exit shell mode\n'));
    } else {
      console.log(chalk.cyan.bold('\n✓ Exited Persistent Shell Mode\n'));
    }

    return this.active;
  }

  /**
   * Execute a command in shell mode
   */
  async executeInMode(command) {
    if (!command.trim()) {
      return null;
    }

    // Store in history
    this.commandHistory.push({
      command,
      timestamp: new Date().toISOString(),
    });

    // Execute command
    const result = await executeShellCommand(command, {
      yoloMode: this.yoloMode,
      dangerousList: this.dangerousList,
    });

    return result;
  }

  /**
   * Get command history
   */
  getHistory() {
    return this.commandHistory;
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }

  /**
   * Format command results for AI context
   */
  formatForContext(command, result) {
    const timestamp = new Date().toISOString();
    let context = `\n<shell-command timestamp="${timestamp}">\n`;
    context += `Command: ${command}\n`;
    context += `Exit Code: ${result.exitCode}\n`;

    if (result.stdout) {
      context += `\nOutput:\n${result.stdout}\n`;
    }

    if (result.stderr) {
      context += `\nErrors:\n${result.stderr}\n`;
    }

    context += `</shell-command>\n`;

    return context;
  }
}

/**
 * Parse bang-command from user input
 * Returns null if not a bang command
 */
export function parseBangCommand(input) {
  const trimmed = input.trim();

  // Check for persistent shell mode toggle: just "!"
  if (trimmed === '!') {
    return {
      type: 'toggle-shell-mode',
      command: null,
    };
  }

  // Check for single bang command: !command args
  if (trimmed.startsWith('!') && trimmed.length > 1) {
    return {
      type: 'single-command',
      command: trimmed.slice(1).trim(),
    };
  }

  return null;
}

/**
 * Get default dangerous commands list
 */
export function getDefaultDangerousCommands() {
  return [...DEFAULT_DANGEROUS_COMMANDS];
}
