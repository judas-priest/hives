#!/usr/bin/env node

/**
 * Интерактивный тест fuzzy matching
 * Запустите: node test-interactive.js
 */

import readline from 'readline';
import { createCompleter, fuzzyScore } from './shared/lib/autocomplete.js';

console.log('🎯 Interactive Fuzzy Matching Test');
console.log('Try typing commands like: /mem, /ver, /hel, /s, /yol');
console.log('Press TAB for autocomplete, type /exit to quit\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'You > ',
  completer: createCompleter([])
});

rl.prompt();

rl.on('line', (line) => {
  const trimmed = line.trim();
  
  if (trimmed === '/exit') {
    console.log('Goodbye! 👋');
    rl.close();
    return;
  }

  if (trimmed.startsWith('/')) {
    console.log(`\n🔍 Fuzzy match test for: "${trimmed}"`);
    
    const commands = [
      '/help', '/version', '/tools', '/memory', '/settings', 
      '/restore', '/clear', '/history', '/sessions', '/save', 
      '/load', '/markdown', '/yolo', '/init', '/exit'
    ];

    const scoredCommands = commands.map(cmd => ({
      cmd,
      score: fuzzyScore(trimmed, cmd)
    }));

    const matches = scoredCommands
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (matches.length > 0) {
      console.log('✅ Matches found:');
      matches.forEach(match => {
        console.log(`  ${match.cmd} (score: ${match.score})`);
      });
    } else {
      console.log('❌ No matches found');
    }
    console.log('');
  }

  rl.prompt();
});

rl.on('close', () => {
  process.exit(0);
});
