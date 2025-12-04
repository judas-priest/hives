/**
 * Test autocomplete functionality
 */
import { createCompleter, fuzzyMatch, fuzzyScore, highlightMatch } from './src/utils/completer.js';

console.log('Testing autocomplete functionality...\n');

// Test 1: Test fuzzy match
console.log('1. Testing fuzzyMatch function:');
console.log('  fuzzyMatch("hel", "help"):', fuzzyMatch("hel", "help"));
console.log('  fuzzyMatch("ext", "exit"):', fuzzyMatch("ext", "exit"));
console.log('  fuzzyMatch("xyz", "help"):', fuzzyMatch("xyz", "help"));

// Test 2: Test fuzzy score
console.log('\n2. Testing fuzzyScore function:');
console.log('  fuzzyScore("hel", "help"):', fuzzyScore("hel", "help"));
console.log('  fuzzyScore("ext", "exit"):', fuzzyScore("ext", "exit"));
console.log('  fuzzyScore("h", "help"):', fuzzyScore("h", "help"));

// Test 3: Test highlight match (check for ANSI codes)
console.log('\n3. Testing highlightMatch function:');
const highlighted = highlightMatch("hel", "help");
console.log('  highlightMatch("hel", "help"):', highlighted);
console.log('  Contains ANSI codes:', /\x1b\[/.test(highlighted));

// Test 4: Test completer with slash commands
console.log('\n4. Testing completer with slash commands:');
const completer = createCompleter(() => []);
const result1 = completer('/he');
console.log('  completer("/he"):', result1);
console.log('  Completions contain ANSI codes:', result1[0].some(c => /\x1b\[/.test(c)));

const result2 = completer('/q');
console.log('  completer("/q"):', result2);
console.log('  Completions contain ANSI codes:', result2[0].some(c => /\x1b\[/.test(c)));

// Test 5: Test completer with history
console.log('\n5. Testing completer with history:');
const completerWithHistory = createCompleter(() => ['hello world', 'help me', 'test command']);
const result3 = completerWithHistory('hel');
console.log('  completerWithHistory("hel"):', result3);
console.log('  Completions contain ANSI codes:', result3[0].some(c => /\x1b\[/.test(c)));

console.log('\n✅ Test complete');
