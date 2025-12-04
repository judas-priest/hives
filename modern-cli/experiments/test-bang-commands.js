#!/usr/bin/env node

/**
 * Test Bang-Command System
 * Tests the new shell command execution features
 */

import { parseBangCommand, executeShellCommand, BangShellMode } from '../src/utils/bang-shell.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🧪 Testing Bang-Command System\n'));

// Test 1: Parse bang commands
console.log(chalk.yellow('Test 1: Command parsing'));
console.log('─'.repeat(60));

const testCases = [
  { input: '!pwd', expected: 'single-command' },
  { input: '!', expected: 'toggle-shell-mode' },
  { input: '!ls -la', expected: 'single-command' },
  { input: '!git status', expected: 'single-command' },
  { input: 'regular text', expected: null },
  { input: '/help', expected: null },
];

for (const test of testCases) {
  const result = parseBangCommand(test.input);
  const passed = (result?.type === test.expected) || (result === null && test.expected === null);

  if (passed) {
    console.log(chalk.green(`✓ "${test.input}" → ${test.expected || 'null'}`));
  } else {
    console.log(chalk.red(`✗ "${test.input}" → Expected: ${test.expected}, Got: ${result?.type || 'null'}`));
  }
}

// Test 2: BangShellMode toggle
console.log(chalk.yellow('\n\nTest 2: Shell mode toggle'));
console.log('─'.repeat(60));

const shellMode = new BangShellMode({ yoloMode: true });
console.log(`Initial state: ${shellMode.isActive() ? chalk.yellow('Active') : chalk.gray('Inactive')}`);

shellMode.toggle();
console.log(`After toggle 1: ${shellMode.isActive() ? chalk.yellow('Active') : chalk.gray('Inactive')}`);

shellMode.toggle();
console.log(`After toggle 2: ${shellMode.isActive() ? chalk.yellow('Active') : chalk.gray('Inactive')}`);

if (shellMode.isActive() === false) {
  console.log(chalk.green('✓ Toggle works correctly'));
} else {
  console.log(chalk.red('✗ Toggle failed'));
}

// Test 3: Safe command execution (YOLO mode for testing)
console.log(chalk.yellow('\n\nTest 3: Safe command execution'));
console.log('─'.repeat(60));

try {
  console.log(chalk.cyan('Executing: !echo "Hello from bang-command"'));
  const result = await executeShellCommand('echo "Hello from bang-command"', { yoloMode: true });

  if (result.success && result.stdout.includes('Hello from bang-command')) {
    console.log(chalk.green('✓ Command executed successfully'));
  } else {
    console.log(chalk.red('✗ Command execution failed'));
  }
} catch (error) {
  console.log(chalk.red(`✗ Error: ${error.message}`));
}

// Test 4: Command history tracking
console.log(chalk.yellow('\n\nTest 4: Command history tracking'));
console.log('─'.repeat(60));

const historyMode = new BangShellMode({ yoloMode: true });
await historyMode.executeInMode('echo "test1"');
await historyMode.executeInMode('echo "test2"');
await historyMode.executeInMode('echo "test3"');

const history = historyMode.getHistory();
console.log(`History length: ${history.length}`);

if (history.length === 3) {
  console.log(chalk.green('✓ History tracking works'));
  history.forEach((entry, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${entry.command} (${new Date(entry.timestamp).toLocaleTimeString()})`));
  });
} else {
  console.log(chalk.red(`✗ History tracking failed (expected 3, got ${history.length})`));
}

// Test 5: Context formatting
console.log(chalk.yellow('\n\nTest 5: Context formatting for AI'));
console.log('─'.repeat(60));

const contextMode = new BangShellMode({ yoloMode: true });
const mockResult = {
  success: true,
  stdout: 'output text',
  stderr: '',
  exitCode: 0,
};

const formatted = contextMode.formatForContext('test command', mockResult);
console.log(chalk.gray(formatted));

if (formatted.includes('test command') && formatted.includes('output text')) {
  console.log(chalk.green('✓ Context formatting works'));
} else {
  console.log(chalk.red('✗ Context formatting failed'));
}

// Summary
console.log(chalk.cyan.bold('\n\n✅ Bang-Command System Tests Complete!\n'));
console.log(chalk.gray('All core functionality has been tested.'));
console.log(chalk.gray('To test interactively, run: npm start\n'));
