#!/usr/bin/env node
/**
 * Test Tab completion behavior
 */

import { createCompleter, fuzzyMatch, fuzzyScore, highlightMatch } from './src/utils/completer.js';

console.log('=== Testing Tab Completion ===\n');

// Test 1: Fuzzy matching for commands
console.log('1. Testing command fuzzy matching:');
const commands = ['/help', '/exit', '/quit', '/clear', '/history', '/reset', '/version', '/model', '/yolo', '/stream', '/tools', '/save', '/load', '/sessions'];

// Test /h
const hPattern = 'h';
const hMatches = commands.filter(cmd => fuzzyMatch(hPattern, cmd.substring(1)));
console.log(`  Pattern: "/h"`);
console.log(`  Matches: ${hMatches.join(', ')}`);
console.log(`  Expected: /help, /history`);
console.log(`  ${hMatches.length === 2 && hMatches.includes('/help') && hMatches.includes('/history') ? '✓ PASS' : '✗ FAIL'}\n`);

// Test 2: Fuzzy score ordering
console.log('2. Testing fuzzy score ordering:');
const hScores = commands
  .filter(cmd => fuzzyMatch(hPattern, cmd.substring(1)))
  .map(cmd => ({
    cmd,
    score: fuzzyScore(hPattern, cmd.substring(1))
  }))
  .sort((a, b) => b.score - a.score);

console.log('  Scores for "/h":');
hScores.forEach(({ cmd, score }) => {
  console.log(`    ${cmd}: ${score}`);
});
console.log();

// Test 3: Highlighting
console.log('3. Testing highlighting:');
console.log(`  Pattern: "h"`);
console.log(`  Text: "help" →`, highlightMatch('h', 'help'));
console.log(`  Text: "history" →`, highlightMatch('h', 'history'));
console.log();

// Test 4: Complete completer function
console.log('4. Testing completer function:');
const completer = createCompleter(() => []);

const test1 = completer('/');
console.log(`  Input: "/" → ${test1[0].length} completions`);
console.log(`  Expected: All commands (${commands.length})`);
console.log(`  ${test1[0].length === commands.length ? '✓ PASS' : '✗ FAIL'}\n`);

const test2 = completer('/h');
console.log(`  Input: "/h" → ${test2[0].length} completions`);
console.log(`  Completions: ${test2[0].join(', ')}`);
console.log(`  Expected: 2 (/help, /history)`);
console.log(`  ${test2[0].length === 2 ? '✓ PASS' : '✗ FAIL'}\n`);

const test3 = completer('/@');
console.log(`  Input: "@" → ${test3[0].length} completions`);
console.log(`  Expected: Should not crash`);
console.log(`  ✓ PASS (no crash)\n`);

console.log('=== Test Summary ===');
console.log('Tab completion tests completed!');
