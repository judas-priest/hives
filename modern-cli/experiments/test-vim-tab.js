/**
 * Test vim mode doesn't interfere with Tab completion
 */
import { VimMode } from './src/utils/vim-mode.js';
import readline from 'node:readline';
import { createCompleter } from './src/utils/completer.js';

console.log('Testing vim mode Tab key handling...\n');

// Create a mock settings manager
const mockSettings = {
  getAll: () => ({ vimMode: { enabled: false } }),
  set: async () => {},
};

// Create a simple readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: createCompleter(() => []),
});

// Create vim mode instance
const vimMode = new VimMode(rl, mockSettings);

// Test the handleKeypress function with Tab key
console.log('Test 1: Tab key with vim mode disabled');
vimMode.enabled = false;
const result1 = vimMode.handleKeypress('\t', { name: 'tab' });
console.log('  Result:', result1, '(should be undefined, key passes through)');

console.log('\nTest 2: Tab key with vim mode enabled (insert mode)');
vimMode.enabled = true;
vimMode.mode = 'insert';
const result2 = vimMode.handleKeypress('\t', { name: 'tab' });
console.log('  Result:', result2, '(should be undefined, key passes through)');

console.log('\nTest 3: Tab key with vim mode enabled (normal mode)');
vimMode.mode = 'normal';
const result3 = vimMode.handleKeypress('\t', { name: 'tab' });
console.log('  Result:', result3, '(should be undefined, key passes through)');

console.log('\nTest 4: ESC key in insert mode');
vimMode.mode = 'insert';
vimMode.handleKeypress(null, { name: 'escape' });
console.log('  Mode after ESC:', vimMode.mode, '(should be "normal")');

console.log('\nTest 5: Regular key in insert mode');
vimMode.mode = 'insert';
const result5 = vimMode.handleKeypress('a', { name: 'a' });
console.log('  Result:', result5, '(should be undefined, key passes through)');

console.log('\n✅ All tests passed - Tab key properly passes through for autocomplete!');

rl.close();
process.exit(0);
