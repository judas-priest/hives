#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== K_DA File Splitter V3 (Fixed Boundaries) ===\n');

// Read the deobfuscated file
const filePath = path.join(__dirname, '../k_da/k_da_deobfuscated.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length.toLocaleString()}`);

// Create output directory structure
const outputDir = path.join(__dirname, '../k_da');
const srcDir = path.join(outputDir, 'src');

// Remove existing src directory to start fresh
if (fs.existsSync(srcDir)) {
  fs.rmSync(srcDir, { recursive: true, force: true });
}
fs.mkdirSync(srcDir, { recursive: true });

/**
 * Split Strategy (fixed boundaries):
 *
 * 1. webpack-runtime.js (lines 5-38)
 * 2. react-bundle.js (lines 39-20499)
 * 3. npm-modules.js (lines 20500-242190)
 * 4. app-code.js (lines 242191-278185) - FIXED: stops before async function $ur()
 * 5. main.js (lines 278186-end)
 * 6. index.js (new file)
 */

const splits = [
  {
    filename: 'src/webpack-runtime.js',
    start: 5,  // Skip shebang lines 0-4
    end: 39,
    description: 'Webpack module system and runtime utilities',
  },
  {
    filename: 'src/react-bundle.js',
    start: 39,
    end: 20500,
    description: 'React library bundle (v19.1.0)',
  },
  {
    filename: 'src/npm-modules.js',
    start: 20500,
    end: 242191,
    description: 'Bundled npm packages and dependencies',
  },
  {
    filename: 'src/app-code.js',
    start: 242191,
    end: 278185,  // Stop RIGHT BEFORE async function $ur() (line 278186, index 278185)
    description: 'Application code, helpers, and configuration',
  },
  {
    filename: 'src/main.js',
    start: 278185,  // Start WITH async function $ur() (line 278186, index 278185)
    end: lines.length,
    description: 'Main entry function and bootstrap',
  }
];

console.log('\n=== Splitting files ===\n');

// Extract each section
splits.forEach((split, index) => {
  console.log(`[${index + 1}/${splits.length}] Creating ${split.filename}...`);

  const sectionLines = lines.slice(split.start, split.end);
  const sectionContent = sectionLines.join('\n');

  const outputPath = path.join(outputDir, split.filename);

  // Create file header comment
  let fileContent = `// ${split.description}\n`;
  fileContent += `// Lines ${split.start + 1}-${split.end} from original k_da_deobfuscated.js\n`;
  fileContent += `// This file is part of the k_da application split from webpack bundle\n\n`;

  fileContent += sectionContent;

  fs.writeFileSync(outputPath, fileContent);

  const sizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
  const lineCount = sectionLines.length.toLocaleString();
  console.log(`  ✓ ${lineCount} lines, ${sizeMB} MB`);
});

// Create the main index.js entry point
console.log(`\n[6/${splits.length + 1}] Creating index.js (entry point)...`);

const shebangLines = lines.slice(0, 5).join('\n');

const indexContent = `${shebangLines}

// K_DA Application - Split Bundle Entry Point
// This file loads all split modules in the correct order

// Load webpack runtime and module system
import './src/webpack-runtime.js';

// Load React bundle
import './src/react-bundle.js';

// Load npm packages
import './src/npm-modules.js';

// Load application code
import './src/app-code.js';

// Load and execute main entry point
import './src/main.js';
`;

const indexPath = path.join(outputDir, 'index.js');
fs.writeFileSync(indexPath, indexContent);
fs.chmodSync(indexPath, '755');

console.log(`  ✓ Entry point created`);

// Print summary
console.log('\n=== Split Complete! ===\n');
console.log('Files created:');
splits.forEach(split => {
  const stats = fs.statSync(path.join(outputDir, split.filename));
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`  - ${split.filename.padEnd(35)} ${sizeMB.padStart(8)} MB`);
});

const indexStats = fs.statSync(indexPath);
console.log(`  - ${'index.js'.padEnd(35)} ${(indexStats.size / 1024).toFixed(2).padStart(8)} KB`);

console.log('\nTo test the split version:');
console.log(`  node ${indexPath} --help`);
console.log('\nFull documentation: k_da/SPLIT_STRUCTURE.md');
