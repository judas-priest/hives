#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== K_DA File Splitter V2 ===\n');

// Read the deobfuscated file
const filePath = path.join(__dirname, '../k_da/k_da_deobfuscated.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length.toLocaleString()}`);

// Create output directory structure
const outputDir = path.join(__dirname, '../k_da');
const srcDir = path.join(outputDir, 'src');

if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

/**
 * Split Strategy (respecting webpack module boundaries):
 *
 * 1. webpack-runtime.js (lines 5-38)
 *    - Webpack module system utilities and helpers
 *    - Core runtime needed by all modules
 *
 * 2. react-bundle.js (lines 39-20499)
 *    - Complete React library bundle
 *    - React JSX runtime
 *
 * 3. npm-modules.js (lines 20500-242190)
 *    - All bundled npm packages
 *    - Third-party dependencies
 *
 * 4. app-code.js (lines 242191-278185)
 *    - Application-specific imports
 *    - Helper functions
 *    - Configuration and utility code
 *
 * 5. main.js (lines 278186-end)
 *    - Main entry function
 *    - Application bootstrap
 *
 * 6. index.js (new file)
 *    - Entry point that imports all parts in order
 *    - Maintains shebang and initial setup
 */

const splits = [
  {
    filename: 'src/webpack-runtime.js',
    start: 5,  // Skip shebang lines 0-4
    end: 39,
    description: 'Webpack module system and runtime utilities',
    isModule: true
  },
  {
    filename: 'src/react-bundle.js',
    start: 39,
    end: 20500,
    description: 'React library bundle (v19.1.0)',
    isModule: true
  },
  {
    filename: 'src/npm-modules.js',
    start: 20500,
    end: 242191,
    description: 'Bundled npm packages and dependencies',
    isModule: true
  },
  {
    filename: 'src/app-code.js',
    start: 242191,
    end: 278186,
    description: 'Application code, helpers, and configuration',
    isModule: true
  },
  {
    filename: 'src/main.js',
    start: 278186,
    end: lines.length,
    description: 'Main entry function and bootstrap',
    isModule: true
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

  // For the first file, include imports from webpack runtime
  if (index === 0) {
    fileContent += `// Webpack runtime needs no imports\n`;
  } else {
    fileContent += `// This module depends on webpack-runtime.js being loaded first\n`;
  }

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

// Create a README for the split structure
const readmeContent = `# K_DA Split Structure

This directory contains the k_da application split into multiple files for better maintainability.

## File Structure

\`\`\`
k_da/
├── index.js              # Main entry point (run this file)
├── src/
│   ├── webpack-runtime.js   # Webpack module system (${(fs.statFileSync(path.join(srcDir, 'webpack-runtime.js')).size / 1024).toFixed(0)} KB)
│   ├── react-bundle.js      # React library (${(fs.statSync(path.join(srcDir, 'react-bundle.js')).size / 1024 / 1024).toFixed(1)} MB)
│   ├── npm-modules.js       # NPM dependencies (${(fs.statSync(path.join(srcDir, 'npm-modules.js')).size / 1024 / 1024).toFixed(1)} MB)
│   ├── app-code.js          # Application code (${(fs.statSync(path.join(srcDir, 'app-code.js')).size / 1024 / 1024).toFixed(1)} MB)
│   └── main.js              # Entry function (${(fs.statSync(path.join(srcDir, 'main.js')).size / 1024).toFixed(0)} KB)
├── k_da.js               # Original deobfuscated file (kept for reference)
├── .env.example          # Environment variables reference
└── README.md             # Application documentation
\`\`\`

## Load Order

The files must be loaded in this exact order:

1. **webpack-runtime.js** - Sets up the webpack module system
2. **react-bundle.js** - Loads React library
3. **npm-modules.js** - Loads third-party dependencies
4. **app-code.js** - Loads application-specific code
5. **main.js** - Runs the main entry function

## Usage

Run the application using:

\`\`\`bash
./index.js [options]
# or
node index.js [options]
\`\`\`

## Notes

- All files are interdependent and rely on shared closure scope
- The split maintains the original webpack bundle structure
- Original line numbers are preserved in file headers for reference
- See ../README.md for full application documentation
`;

fs.writeFileSync(path.join(outputDir, 'SPLIT_STRUCTURE.md'), readmeContent);

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

console.log('\nTo run the split version:');
console.log(`  node ${indexPath}`);
console.log(`  or: ${indexPath}`);
console.log('\nDocumentation: k_da/SPLIT_STRUCTURE.md');
