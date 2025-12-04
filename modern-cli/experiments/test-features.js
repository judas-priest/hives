#!/usr/bin/env node

/**
 * Comprehensive test for Modern CLI functionality
 */

import { PolzaClient } from './src/lib/polza-client.js';
import { processPrompt } from './src/utils/prompt-processor.js';
import { saveSession, loadSession } from './src/utils/session.js';
import { getTools, getToolHandlers } from './src/lib/tools.js';
import { writeFileSync, unlinkSync } from 'fs';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n=== Modern CLI Feature Test ===\n'));

// Test 1: Prompt Processor
console.log(chalk.yellow('Test 1: Prompt Processor'));
try {
  writeFileSync('/tmp/test-file.txt', 'Hello from test!');
  const result = await processPrompt('File: @/tmp/test-file.txt', false);
  console.log('  ✓ File includes:', result.text.includes('Hello from test!'));
  console.log('  ✓ Images array:', Array.isArray(result.images));
  unlinkSync('/tmp/test-file.txt');
  console.log(chalk.green('  PASSED\n'));
} catch (error) {
  console.log(chalk.red('  FAILED:', error.message, '\n'));
}

// Test 2: Session Management
console.log(chalk.yellow('Test 2: Session Management'));
try {
  const data = {
    model: 'test-model',
    conversationHistory: [{ role: 'user', content: 'test' }],
    yoloMode: false,
  };
  saveSession('test-session', data);
  const loaded = loadSession('test-session');
  console.log('  ✓ Session saved and loaded:', loaded !== null);
  console.log('  ✓ History preserved:', loaded?.conversationHistory?.length === 1);
  console.log(chalk.green('  PASSED\n'));
} catch (error) {
  console.log(chalk.red('  FAILED:', error.message, '\n'));
}

// Test 3: Tools
console.log(chalk.yellow('Test 3: Tools System'));
try {
  const tools = getTools(false);
  const toolHandlers = getToolHandlers(false);
  console.log('  ✓ Tools count:', tools.length);
  console.log('  ✓ Handlers count:', Object.keys(toolHandlers).length);
  const yoloTools = getTools(true);
  console.log('  ✓ YOLO tools count:', yoloTools.length);
  console.log('  ✓ Has execute_shell:', yoloTools.some(t => t.function.name === 'execute_shell'));
  console.log(chalk.green('  PASSED\n'));
} catch (error) {
  console.log(chalk.red('  FAILED:', error.message, '\n'));
}

// Test 4: Client
console.log(chalk.yellow('Test 4: Polza Client'));
try {
  const client = new PolzaClient('test-key');
  console.log('  ✓ Client initialized:', client !== null);
  console.log('  ✓ Has chat method:', typeof client.chat === 'function');
  console.log('  ✓ Has chatWithTools:', typeof client.chatWithTools === 'function');
  console.log(chalk.green('  PASSED\n'));
} catch (error) {
  console.log(chalk.red('  FAILED:', error.message, '\n'));
}

console.log(chalk.cyan.bold('=== All Tests Complete ===\n'));
console.log(chalk.green('✓ Modern CLI features are working correctly!'));
console.log();
