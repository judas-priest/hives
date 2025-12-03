#!/usr/bin/env node

// Тест fuzzy matching для Polza CLI
import { fuzzyScore } from './shared/lib/autocomplete.js';

console.log('🧪 Testing Fuzzy Matching:\n');

// Тестовые команды
const commands = [
  '/help', '/version', '/tools', '/memory', '/settings', 
  '/restore', '/clear', '/history', '/sessions', '/save', 
  '/load', '/markdown', '/yolo', '/init', '/exit'
];

// Тестовые паттерны
const testPatterns = [
  'mem',      // должно найти /memory
  'ver',      // должно найти /version  
  'hel',      // должно найти /help
  's',        // должно найти /save, /sessions, /settings
  'yol',      // должно найти /yolo
  'rst',      // должно найти /restore, /reset (из settings)
];

testPatterns.forEach(pattern => {
  console.log(`🔍 Pattern: "${pattern}"`);
  
  const scoredCommands = commands.map(cmd => ({
    cmd,
    score: fuzzyScore(pattern, cmd)
  }));

  const matches = scoredCommands
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Топ 3 результата

  matches.forEach(match => {
    console.log(`  ✅ ${match.cmd} (score: ${match.score})`);
  });

  if (matches.length === 0) {
    console.log(`  ❌ No matches found`);
  }

  console.log('');
});

console.log('✨ Test completed!');