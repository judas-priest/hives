#!/usr/bin/env node

/**
 * Create missing source files from original.js for k_da build process
 * This script extracts the necessary parts to match build.js expectations
 */

const fs = require('fs');
const path = require('path');

console.log('=== Creating missing source files for k_da ===\n');

const kdaDir = path.join(__dirname, '../k_da');
const srcDir = path.join(kdaDir, 'src');
const i18nDir = path.join(srcDir, 'i18n');
const localesDir = path.join(i18nDir, 'locales');

// Create directories
fs.mkdirSync(localesDir, { recursive: true });

// Read original.js
const originalPath = path.join(kdaDir, 'original.js');
const content = fs.readFileSync(originalPath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines in original.js: ${lines.length.toLocaleString()}`);

// Define file splits based on build.js expectations
const splits = [
  {
    filename: 'src/00-shebang.js',
    start: 0,
    end: 5,
    description: 'Shebang and file header'
  },
  {
    filename: 'src/01-webpack-runtime.js',
    start: 5,
    end: 39,
    description: 'Webpack module system and runtime utilities'
  },
  {
    filename: 'src/02-react-bundle.js',
    start: 39,
    end: 20500,
    description: 'React library bundle (v19.1.0)'
  },
  {
    filename: 'src/03-npm-modules.js',
    start: 20500,
    end: 242191,
    description: 'Bundled npm packages and dependencies'
  },
  // 04-app-code.js already exists
  {
    filename: 'src/05-main.js',
    start: 278185,
    end: lines.length,
    description: 'Main entry function and bootstrap'
  }
];

console.log('\n=== Creating source files ===\n');

splits.forEach((split, index) => {
  const outputPath = path.join(kdaDir, split.filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`[${index + 1}/${splits.length}] Skipping ${split.filename} (already exists)`);
    return;
  }

  console.log(`[${index + 1}/${splits.length}] Creating ${split.filename}...`);

  const sectionLines = lines.slice(split.start, split.end);
  const sectionContent = sectionLines.join('\n');

  // Create file with header comment (except for shebang)
  let fileContent;
  if (split.filename === 'src/00-shebang.js') {
    fileContent = sectionContent;
  } else {
    fileContent = `/**
 * ${split.description}
 * Lines ${split.start + 1}-${split.end} from original k_da/original.js
 * This file is part of the k_da application split from webpack bundle
 */

${sectionContent}`;
  }

  fs.writeFileSync(outputPath, fileContent);

  const sizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
  const lineCount = sectionLines.length.toLocaleString();
  console.log(`  ✓ ${lineCount} lines, ${sizeMB} MB`);
});

console.log('\n=== Source files created successfully! ===\n');
console.log('Next step: Extract i18n locale files from 04-app-code.js');
