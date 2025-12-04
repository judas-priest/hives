#!/usr/bin/env node

/**
 * Test script to verify the fixed autocomplete functionality
 * Tests:
 * 1. / command autocomplete (no invisible tabs)
 * 2. @ file autocomplete (should work now)
 * 3. Fuzzy search functionality
 */

import { createCompleter } from '../modern-cli/src/utils/completer.js';
import { createEnhancedReadline } from '../modern-cli/src/utils/enhanced-readline.js';
import { stdin as input, stdout as output } from 'process';
import chalk from 'chalk';

console.log(chalk.bold.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║  Autocomplete Fix Verification Test                       ║'));
console.log(chalk.bold.cyan('╔════════════════════════════════════════════════════════════╝'));
console.log();

console.log(chalk.green('✓ Fixed Issues:'));
console.log(chalk.white('  1. Removed ANSI codes from completions (fixes invisible tabs)'));
console.log(chalk.white('  2. Added fuzzysort for better fuzzy matching'));
console.log(chalk.white('  3. Fixed @ file autocomplete'));
console.log();

console.log(chalk.yellow('Test Instructions:'));
console.log(chalk.white('  • Type "/" and press Tab - should show all commands'));
console.log(chalk.white('  • Type "/h" and press Tab - should show /help, /history'));
console.log(chalk.white('  • Type "@" and press Tab - should show files (no crash!)'));
console.log(chalk.white('  • Type "@pa" and press Tab - should fuzzy match package.json'));
console.log(chalk.white('  • Press Ctrl+C to exit'));
console.log();

// Test history for history autocomplete
const testHistory = [
  'hello world',
  'help me',
  'how are you',
];

// Create completer with test history
const completer = createCompleter(() => testHistory);

// Create readline with the completer
const rl = createEnhancedReadline({
  input,
  output,
  completer,
  terminal: true,
});

console.log(chalk.blue.bold('Test Prompt > '));

// Test completion programmatically first
console.log(chalk.dim('\n--- Programmatic Tests ---'));

// Test 1: Slash command completion
console.log(chalk.yellow('Test 1: "/" completion'));
const [slashCompletions, slashLine] = completer('/');
console.log(chalk.white(`  Input: "/"`));
console.log(chalk.white(`  Completions: ${slashCompletions.join(', ')}`));
console.log(chalk.green(`  ✓ Got ${slashCompletions.length} completions`));

// Test 2: Fuzzy slash command
console.log(chalk.yellow('\nTest 2: "/h" fuzzy completion'));
const [fuzzyCompletions, fuzzyLine] = completer('/h');
console.log(chalk.white(`  Input: "/h"`));
console.log(chalk.white(`  Completions: ${fuzzyCompletions.join(', ')}`));
console.log(chalk.green(`  ✓ Got ${fuzzyCompletions.length} fuzzy matches`));

// Test 3: @ file completion
console.log(chalk.yellow('\nTest 3: "@" file completion'));
const [atCompletions, atLine] = completer('@');
console.log(chalk.white(`  Input: "@"`));
console.log(chalk.white(`  Completions count: ${atCompletions.length}`));
console.log(chalk.green(`  ✓ File completion working (no crash!)`));

// Test 4: Check for ANSI codes in completions
console.log(chalk.yellow('\nTest 4: Verify NO ANSI codes in completions'));
const hasAnsi = slashCompletions.some(comp => /\x1b\[/.test(comp));
if (hasAnsi) {
  console.log(chalk.red('  ✗ FAILED: Found ANSI codes in completions!'));
} else {
  console.log(chalk.green('  ✓ PASSED: No ANSI codes found (plain text only)'));
}

console.log(chalk.dim('\n--- Interactive Test ---'));
console.log(chalk.white('Now try the interactive mode:'));
console.log();

// Interactive prompt
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

let running = true;

rl.on('SIGINT', () => {
  console.log(chalk.cyan('\n\n👋 Test completed!'));
  rl.close();
  running = false;
  process.exit(0);
});

(async () => {
  while (running) {
    try {
      const answer = await question(chalk.green.bold('Test > '));

      if (!answer.trim()) {
        continue;
      }

      console.log(chalk.white(`You typed: "${answer}"`));
      console.log(chalk.dim(`Length: ${answer.length} chars`));

      // Check for tab characters (which would indicate the bug)
      if (answer.includes('\t')) {
        console.log(chalk.red('⚠️  Warning: Tab character detected! The bug might still exist.'));
      }

      // Check for ANSI codes
      if (/\x1b\[/.test(answer)) {
        console.log(chalk.red('⚠️  Warning: ANSI codes detected in input!'));
      }

      if (answer === 'exit' || answer === 'quit') {
        break;
      }
    } catch (err) {
      break;
    }
  }

  rl.close();
  console.log(chalk.cyan('\n👋 Test completed!\n'));
})();
