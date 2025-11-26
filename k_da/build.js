#!/usr/bin/env node

/**
 * Build script for K_DA
 * Concatenates split source files into a working executable
 */

const fs = require('fs');
const path = require('path');

console.log('Building k_da.js from split sources...\n');

// Files to concatenate in order
const sourceFiles = [
  'src/01-webpack-runtime.js',
  'src/02-react-bundle.js',
  'src/03-npm-modules.js',
  'src/04-app-code.js',
  'src/05-main.js',
];

// Read the shebang and imports from original (lines 1-5)
const originalFile = path.join(__dirname, 'k_da_deobfuscated.js');
const originalLines = fs.readFileSync(originalFile, 'utf8').split('\n');
const shebang = originalLines.slice(0, 5).join('\n');

// Start with shebang
let output = shebang + '\n\n';

// Concatenate all source files
sourceFiles.forEach((file, index) => {
  console.log(`[${index + 1}/${sourceFiles.length}] Adding ${file}...`);
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the header comment (everything before the first non-comment line)
  content = content.replace(/^\/\*[\s\S]*?\*\/\s*/, '');

  output += content;

  // Add separator comment between files
  if (index < sourceFiles.length - 1) {
    output += '\n// === End of ' + file + ' ===\n\n';
  }
});

// Write the built file
const outputPath = path.join(__dirname, 'k_da.js');
fs.writeFileSync(outputPath, output);
fs.chmodSync(outputPath, '755');

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`\n✓ Built ${outputPath} (${sizeMB} MB)\n`);
console.log('To run: ./k_da/k_da.js or node k_da/k_da.js');
