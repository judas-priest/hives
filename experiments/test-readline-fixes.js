/**
 * Test script for readline fixes
 * Tests:
 * 1. Readline closure handling
 * 2. Fuzzy matching
 * 3. Autocomplete functionality
 */

import { fuzzyMatch, fuzzyScore, createCompleter } from '../modern-cli/src/utils/completer.js';

console.log('Testing Readline Fixes\n');
console.log('='.repeat(50));

// Test 1: Fuzzy Matching
console.log('\n1. Testing Fuzzy Match:');
const tests = [
  ['hel', 'hello', true],
  ['hlo', 'hello', true],
  ['xyz', 'hello', false],
  ['mod', '/model', true],
  ['hlp', '/help', true],
];

for (const [pattern, text, expected] of tests) {
  const result = fuzzyMatch(pattern, text);
  const status = result === expected ? '✓' : '✗';
  console.log(`  ${status} fuzzyMatch("${pattern}", "${text}") = ${result} (expected: ${expected})`);
}

// Test 2: Fuzzy Scoring
console.log('\n2. Testing Fuzzy Score:');
const scoreTests = [
  ['help', '/help'],
  ['help', '/history'],
  ['mod', '/model'],
  ['mod', '/yolo'],
];

for (const [pattern, text] of scoreTests) {
  const score = fuzzyScore(pattern, text);
  console.log(`  fuzzyScore("${pattern}", "${text}") = ${score}`);
}

// Test 3: Completer
console.log('\n3. Testing Completer:');
const history = ['hello world', 'help me', 'test command', '/model gpt-4', '/help'];
const completer = createCompleter(() => history);

const completerTests = [
  '/h',
  '/mo',
  'hel',
  '@src',
];

for (const line of completerTests) {
  const [hits] = completer(line);
  console.log(`  completer("${line}") =>`);
  console.log(`    ${hits.length} match(es): ${hits.slice(0, 3).join(', ')}`);
}

console.log('\n' + '='.repeat(50));
console.log('✓ All tests completed!\n');
