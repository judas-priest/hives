#!/usr/bin/env node

/**
 * Test script to understand the Tab autocomplete issue
 * This demonstrates how ANSI codes in completions break readline
 */

import readline from 'node:readline';
import chalk from 'chalk';

console.log('Testing autocomplete behaviors:\n');

// Test 1: With ANSI codes (BROKEN - causes issues)
console.log('Test 1: Completions WITH ANSI codes (current broken implementation)');
const rl1 = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  completer: (line) => {
    const commands = ['/help', '/exit', '/history'];

    if (line.startsWith('/')) {
      // Return completions with ANSI codes (THIS IS THE BUG!)
      const highlighted = commands.map(cmd => chalk.yellow(cmd));
      return [highlighted, line];
    }

    return [[], line];
  }
});

console.log('Type "/" and press Tab. You will see weird behavior with ANSI codes.');
console.log('The completions will have invisible characters and Tab may insert tabs.\n');

rl1.question('Test 1 > ', (answer) => {
  console.log(`You entered: "${answer}"`);
  console.log(`Length: ${answer.length}`);
  console.log(`Hex dump: ${Buffer.from(answer).toString('hex')}\n`);
  rl1.close();

  // Test 2: Without ANSI codes (CORRECT)
  console.log('\nTest 2: Completions WITHOUT ANSI codes (correct implementation)');
  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: (line) => {
      const commands = ['/help', '/exit', '/history'];

      if (line.startsWith('/')) {
        // Return plain completions (NO ANSI codes)
        return [commands, line];
      }

      return [[], line];
    }
  });

  console.log('Type "/" and press Tab. This should work correctly.\n');

  rl2.question('Test 2 > ', (answer) => {
    console.log(`You entered: "${answer}"`);
    console.log(`Length: ${answer.length}`);
    console.log(`Hex dump: ${Buffer.from(answer).toString('hex')}`);
    rl2.close();

    console.log('\n✓ Tests completed!');
    console.log('The issue: ANSI codes in completions break readline behavior.');
    console.log('Solution: Return plain text completions, handle display separately.');
  });
});
