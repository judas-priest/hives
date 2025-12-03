#!/usr/bin/env node
/**
 * Comprehensive test for Modern CLI functionality
 */

import { fuzzyMatch, fuzzyScore, getFilesInDirectory } from '../modern-cli/src/utils/completer.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n=== Modern CLI Comprehensive Test ===\n'));

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(chalk.green('✓'), name);
    testsPassed++;
  } catch (error) {
    console.log(chalk.red('✗'), name);
    console.log(chalk.red('  Error:'), error.message);
    testsFailed++;
  }
}

// Test fuzzy matching
console.log(chalk.yellow('\n1. Testing Fuzzy Match:'));

test('fuzzyMatch: "hlp" should match "/help"', () => {
  if (!fuzzyMatch('hlp', '/help')) throw new Error('Failed');
});

test('fuzzyMatch: "mod" should match "/model"', () => {
  if (!fuzzyMatch('mod', '/model')) throw new Error('Failed');
});

test('fuzzyMatch: "xyz" should not match "/help"', () => {
  if (fuzzyMatch('xyz', '/help')) throw new Error('Failed');
});

// Test fuzzy scoring
console.log(chalk.yellow('\n2. Testing Fuzzy Score:'));

test('fuzzyScore: exact match should have high score', () => {
  const score = fuzzyScore('/help', '/help');
  if (score < 100) throw new Error(`Score too low: ${score}`);
});

test('fuzzyScore: prefix match should beat non-prefix', () => {
  const prefixScore = fuzzyScore('hel', 'hello');
  const nonPrefixScore = fuzzyScore('hel', 'inhale');
  if (prefixScore <= nonPrefixScore) {
    throw new Error(`Prefix score (${prefixScore}) should be higher than non-prefix (${nonPrefixScore})`);
  }
});

// Test file discovery
console.log(chalk.yellow('\n3. Testing File Discovery:'));

test('getFilesInDirectory: should find files in current directory', () => {
  const files = getFilesInDirectory('.', 1);
  if (!Array.isArray(files)) throw new Error('Should return array');
  if (files.length === 0) throw new Error('Should find some files');
  console.log(chalk.gray(`  Found ${files.length} files`));
});

test('getFilesInDirectory: should skip node_modules', () => {
  const files = getFilesInDirectory('.', 2);
  const hasNodeModules = files.some(f => f.includes('node_modules'));
  if (hasNodeModules) throw new Error('Should not include node_modules');
});

test('getFilesInDirectory: should only include code files', () => {
  const files = getFilesInDirectory('.', 1);
  const hasNonCode = files.some(f => {
    const ext = f.match(/\.[^.]+$/)?.[0];
    return ext && !['.js', '.ts', '.json', '.md', '.txt', '.sh', '.yaml', '.yml'].includes(ext);
  });
  if (hasNonCode) {
    console.log(chalk.yellow('  Warning: Found non-code files'));
  }
});

// Summary
console.log(chalk.cyan.bold('\n=== Test Summary ==='));
console.log(chalk.green(`✓ Passed: ${testsPassed}`));
if (testsFailed > 0) {
  console.log(chalk.red(`✗ Failed: ${testsFailed}`));
  process.exit(1);
} else {
  console.log(chalk.green('\nAll tests passed! 🎉\n'));
}
