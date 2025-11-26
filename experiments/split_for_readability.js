#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== K_DA File Splitter for Readability ===\n');
console.log('This splitter creates multiple files for easier reading and navigation,');
console.log('plus a builder script to recombine them into a working executable.\n');

// Read the deobfuscated file
const filePath = path.join(__dirname, '../k_da/k_da_deobfuscated.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length.toLocaleString()}\n`);

// Create output directory structure
const outputDir = path.join(__dirname, '../k_da');
const srcDir = path.join(outputDir, 'src');

// Clean and create src directory
if (fs.existsSync(srcDir)) {
  fs.rmSync(srcDir, { recursive: true, force: true });
}
fs.mkdirSync(srcDir, { recursive: true });

/**
 * Split Strategy:
 * Each file can be read independently, but they share closure scope.
 * A build script will concatenate them back together for execution.
 */

const splits = [
  {
    filename: 'src/01-webpack-runtime.js',
    start: 5,
    end: 38,
    description: 'Webpack module system and runtime utilities',
  },
  {
    filename: 'src/02-react-bundle.js',
    start: 38,
    end: 20500,
    description: 'React library bundle (v19.1.0)',
  },
  {
    filename: 'src/03-npm-modules.js',
    start: 20500,
    end: 242191,
    description: 'Bundled npm packages and dependencies',
  },
  {
    filename: 'src/04-app-code.js',
    start: 242191,
    end: 278185,
    description: 'Application code, helpers, and configuration',
  },
  {
    filename: 'src/05-main.js',
    start: 278185,
    end: lines.length,
    description: 'Main entry function and bootstrap',
  }
];

console.log('=== Creating split files ===\n');

// Extract each section
const fileHeaders = [];
splits.forEach((split, index) => {
  console.log(`[${index + 1}/${splits.length}] Creating ${split.filename}...`);

  const sectionLines = lines.slice(split.start, split.end);
  const sectionContent = sectionLines.join('\n');

  const outputPath = path.join(outputDir, split.filename);

  // Create file header comment
  let fileContent = `/* ============================================================================\n`;
  fileContent += ` * ${split.description}\n`;
  fileContent += ` * Lines ${split.start + 1}-${split.end} from original k_da_deobfuscated.js\n`;
  fileContent += ` * \n`;
  fileContent += ` * NOTE: This file is part of a webpack bundle split for readability.\n`;
  fileContent += ` * It shares closure scope with other parts and cannot run independently.\n`;
  fileContent += ` * Use the build script to create a working executable.\n`;
  fileContent += ` * ============================================================================ */\n\n`;

  fileContent += sectionContent;

  fs.writeFileSync(outputPath, fileContent);

  const sizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
  const lineCount = sectionLines.length.toLocaleString();
  console.log(`  ✓ ${lineCount.padStart(8)} lines, ${sizeMB.padStart(7)} MB`);

  fileHeaders.push({
    filename: split.filename,
    description: split.description,
    lines: `${split.start + 1}-${split.end}`,
    size: sizeMB
  });
});

// Create build script that concatenates files
console.log(`\n[Build Script] Creating build.js...`);

const buildScriptContent = `#!/usr/bin/env node

/**
 * Build script for K_DA
 * Concatenates split source files into a working executable
 */

const fs = require('fs');
const path = require('path');

console.log('Building k_da.js from split sources...\\n');

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
const originalLines = fs.readFileSync(originalFile, 'utf8').split('\\n');
const shebang = originalLines.slice(0, 5).join('\\n');

// Start with shebang
let output = shebang + '\\n\\n';

// Concatenate all source files
sourceFiles.forEach((file, index) => {
  console.log(\`[\${index + 1}/\${sourceFiles.length}] Adding \${file}...\`);
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the header comment (everything before the first non-comment line)
  content = content.replace(/^\\/\\*[\\s\\S]*?\\*\\/\\s*/, '');

  output += content;

  // Add separator comment between files
  if (index < sourceFiles.length - 1) {
    output += '\\n// === End of ' + file + ' ===\\n\\n';
  }
});

// Write the built file
const outputPath = path.join(__dirname, 'k_da.js');
fs.writeFileSync(outputPath, output);
fs.chmodSync(outputPath, '755');

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(\`\\n✓ Built \${outputPath} (\${sizeMB} MB)\\n\`);
console.log('To run: ./k_da/k_da.js or node k_da/k_da.js');
`;

const buildScriptPath = path.join(outputDir, 'build.js');
fs.writeFileSync(buildScriptPath, buildScriptContent);
fs.chmodSync(buildScriptPath, '755');

console.log('  ✓ Build script created');

// Create README for the src directory
console.log(`\n[Documentation] Creating src/README.md...`);

const srcReadmeContent = `# K_DA Source Files (Split for Readability)

This directory contains the k_da application split into logical sections for easier reading and navigation.

## ⚠️ Important Notes

- **These files cannot run independently** - they are part of a webpack bundle that shares closure scope
- **To create a working executable**, use the build script: \`node ../build.js\`
- The split is purely for readability and code navigation
- All files must be combined in order to function

## File Structure

${fileHeaders.map((f, i) => `${i + 1}. **${path.basename(f.filename)}** (${f.size} MB, lines ${f.lines})
   - ${f.description}`).join('\n\n')}

## How to Use

### For Reading/Understanding the Code

Just open the files in your editor. Each file corresponds to a logical section of the application:

- \`01-webpack-runtime.js\` - Start here to understand the module system
- \`02-react-bundle.js\` - React library code
- \`03-npm-modules.js\` - Third-party npm packages
- \`04-app-code.js\` - Main application logic, authentication, CLI, etc.
- \`05-main.js\` - Entry point and bootstrap

### For Running the Application

1. Build the executable:
   \`\`\`bash
   cd k_da
   node build.js
   \`\`\`

2. Run the built file:
   \`\`\`bash
   ./k_da.js [options]
   # or
   node k_da.js [options]
   \`\`\`

## Why This Structure?

The original \`k_da_deobfuscated.js\` is 278,000+ lines and 9.5 MB, making it difficult to navigate in most editors. This split:

- ✅ Makes it easier to find specific functionality
- ✅ Allows you to focus on one section at a time
- ✅ Provides clear boundaries between React, npm modules, and app code
- ✅ Maintains the original functionality through the build process

## Line Number Reference

Each file header shows the original line numbers from \`k_da_deobfuscated.js\`, making it easy to cross-reference with any documentation or error messages.
`;

fs.writeFileSync(path.join(srcDir, 'README.md'), srcReadmeContent);
console.log('  ✓ Documentation created');

// Print summary
console.log('\n=== Split Complete! ===\n');
console.log('Files created:');
fileHeaders.forEach(f => {
  console.log(`  - ${f.filename.padEnd(35)} ${f.size.padStart(7)} MB`);
});
console.log(`  - ${'build.js'.padEnd(35)} ${'<1'.padStart(7)} KB`);
console.log(`  - ${'src/README.md'.padEnd(35)} ${'<1'.padStart(7)} KB`);

console.log('\n📖 To read the code: Open files in src/ directory');
console.log('🔨 To build executable: node k_da/build.js');
console.log('📚 Full documentation: k_da/README.md');
console.log('🔧 Environment vars: k_da/.env.example');
