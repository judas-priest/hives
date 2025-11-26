#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the deobfuscated file
const filePath = path.join(__dirname, '../k_da/k_da_deobfuscated.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Find module boundaries
const moduleBoundaries = [];
const modulePattern = /^var\s+(\w+)\s*=\s*T\(/;

lines.forEach((line, index) => {
  const match = line.match(modulePattern);
  if (match) {
    moduleBoundaries.push({
      line: index + 1,
      varName: match[1],
      content: line
    });
  }
});

console.log(`\nFound ${moduleBoundaries.length} webpack modules`);

// Analyze key sections
console.log('\n=== Key Section Analysis ===');

// Find React symbols
const reactLine = lines.findIndex(line => line.includes("Symbol.for('react.transitional.element')"));
console.log(`React code starts around line: ${reactLine + 1}`);

// Find main application entry
const mainEntryLine = lines.length - 100; // Usually at the end
console.log(`Main entry likely at end, around line: ${mainEntryLine}`);

// Search for specific patterns
const patterns = {
  'GitHub OAuth': 'github',
  'Authentication': /auth.*token|login.*github|oauth/i,
  'Configuration': /config.*load|loadconfig|getconfig/i,
  'CLI': /commander|yargs|cli.*parse/i,
  'Sandbox': /sandbox/i,
  'IDE Integration': /vscode|jetbrains|cursor|zed/i,
};

console.log('\n=== Pattern Matches ===');
for (const [name, pattern] of Object.entries(patterns)) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  const matches = lines.filter(line => regex.test(line)).length;
  if (matches > 0) {
    console.log(`${name}: ${matches} occurrences`);
  }
}

// Show first and last 10 module boundaries
console.log('\n=== First 10 Modules ===');
moduleBoundaries.slice(0, 10).forEach(m => {
  console.log(`Line ${m.line}: ${m.varName}`);
});

console.log('\n=== Last 10 Modules ===');
moduleBoundaries.slice(-10).forEach(m => {
  console.log(`Line ${m.line}: ${m.varName}`);
});

// Determine logical split points
console.log('\n=== Proposed Split Points ===');
const splits = [
  { name: 'Setup & Utilities', start: 1, end: 38 },
  { name: 'React Bundle', start: 39, end: 20500 },
  { name: 'Core Application Modules', start: 20501, end: lines.length - 1000 },
  { name: 'Main Entry Point', start: lines.length - 1000, end: lines.length }
];

splits.forEach(split => {
  const moduleCount = moduleBoundaries.filter(
    m => m.line >= split.start && m.line <= split.end
  ).length;
  console.log(`${split.name}: lines ${split.start}-${split.end} (${moduleCount} modules)`);
});
