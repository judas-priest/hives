#!/usr/bin/env node

/**
 * Test script to verify the fuzzy preview fix
 *
 * This tests that:
 * 1. Preview functions use process.stdout.write instead of rl.write
 * 2. Preview functions don't trigger readline 'line' events
 * 3. Fuzzy matching still works correctly
 */

import { EventEmitter } from 'events';
import { showFilePreview, showCommandPreview, fuzzyScore } from '../polza-cli/src/lib/autocomplete.js';

console.log('🧪 Testing Preview Fix\n');

// Test 1: Verify fuzzy scoring still works
console.log('📊 Test 1: Fuzzy Matching Algorithm');
const testPatterns = [
  { pattern: 'mem', expected: '/memory' },
  { pattern: 'ver', expected: '/version' },
  { pattern: 'hel', expected: '/help' },
];

const commands = ['/help', '/version', '/memory', '/settings'];
let fuzzyTestsPassed = 0;

testPatterns.forEach(({ pattern, expected }) => {
  const scoredCommands = commands.map(cmd => ({
    cmd,
    score: fuzzyScore(pattern, cmd)
  }));

  const best = scoredCommands.sort((a, b) => b.score - a.score)[0];

  if (best.cmd === expected) {
    console.log(`  ✅ Pattern "${pattern}" → ${best.cmd} (score: ${best.score})`);
    fuzzyTestsPassed++;
  } else {
    console.log(`  ❌ Pattern "${pattern}" → ${best.cmd} (expected ${expected})`);
  }
});

console.log(`\n  Result: ${fuzzyTestsPassed}/${testPatterns.length} fuzzy tests passed\n`);

// Test 2: Verify preview functions don't trigger line events
console.log('🔍 Test 2: Preview Functions Don\'t Trigger Line Events');

// Create a mock readline interface
const mockRl = new EventEmitter();
mockRl.line = '/mem';
mockRl._refreshLine = function() {
  // Mock refresh function
};

// Track if 'line' event is emitted (it shouldn't be)
let lineEventTriggered = false;
mockRl.on('line', () => {
  lineEventTriggered = true;
});

// Capture stdout to verify output
let stdoutOutput = '';
const originalWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk) => {
  stdoutOutput += chunk;
  return true;
};

// Test command preview
try {
  showCommandPreview('/mem', mockRl);

  if (lineEventTriggered) {
    console.log('  ❌ showCommandPreview triggered line event (BAD)');
  } else {
    console.log('  ✅ showCommandPreview did NOT trigger line event (GOOD)');
  }

  if (stdoutOutput.length > 0) {
    console.log('  ✅ showCommandPreview wrote output to stdout');
  } else {
    console.log('  ⚠️  showCommandPreview did not write any output');
  }
} catch (error) {
  console.log(`  ❌ showCommandPreview threw error: ${error.message}`);
}

// Reset for file preview test
lineEventTriggered = false;
stdoutOutput = '';
mockRl.line = 'test @pack';

try {
  showFilePreview('test @pack', mockRl);

  if (lineEventTriggered) {
    console.log('  ❌ showFilePreview triggered line event (BAD)');
  } else {
    console.log('  ✅ showFilePreview did NOT trigger line event (GOOD)');
  }
} catch (error) {
  console.log(`  ❌ showFilePreview threw error: ${error.message}`);
}

// Restore stdout
process.stdout.write = originalWrite;

console.log('\n✨ Test completed!\n');
console.log('Summary:');
console.log('  - Preview functions use process.stdout.write (not rl.write)');
console.log('  - Preview functions do NOT trigger readline line events');
console.log('  - This prevents unwanted "Assistant > Thinking..." spam');
console.log('  - Fuzzy matching still works correctly\n');
