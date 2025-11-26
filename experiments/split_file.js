#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the deobfuscated file
const filePath = path.join(__dirname, '../k_da/k_da_deobfuscated.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Starting file split process...');
console.log(`Total lines: ${lines.length}`);

// Create output directory
const outputDir = path.join(__dirname, '../k_da_split');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Split strategy:
 * 1. utils.js - Lines 1-38: Module system utilities and helpers
 * 2. react-bundle.js - Lines 39-20500: React library and JSX runtime
 * 3. app-modules.js - Lines 20501-242200: Application modules (auth, config, CLI, etc.)
 * 4. index.js - Lines 242201-end: Main entry point and initialization
 */

const splits = [
  {
    name: 'utils.js',
    start: 5,  // Skip shebang and imports (lines 0-4)
    end: 38,
    description: 'Module system utilities and webpack helpers',
    exportType: 'named' // This will export all the helper functions
  },
  {
    name: 'react-bundle.js',
    start: 39,
    end: 20500,
    description: 'React library bundle',
    exportType: 'default'
  },
  {
    name: 'app-modules.js',
    start: 20501,
    end: 242200,
    description: 'Application modules (auth, config, CLI, sandbox, IDE)',
    exportType: 'all'
  },
  {
    name: 'main.js',
    start: 242201,
    end: lines.length,
    description: 'Main entry point and initialization',
    exportType: 'entry'
  }
];

// Extract each section
splits.forEach(split => {
  console.log(`\nExtracting ${split.name}...`);
  const sectionLines = lines.slice(split.start, split.end);
  const sectionContent = sectionLines.join('\n');

  const outputPath = path.join(outputDir, split.name);
  let fileContent = '';

  if (split.name === 'utils.js') {
    // Utils needs the helper functions but not shebang/imports
    fileContent = `// ${split.description}\n\n${sectionContent}`;
  } else if (split.name === 'main.js') {
    // Main entry needs shebang and all imports
    const shebangAndImports = lines.slice(0, 5).join('\n');
    fileContent = `${shebangAndImports}\n\n// Import split modules\nimport './utils.js';\nimport './react-bundle.js';\nimport './app-modules.js';\n\n// ${split.description}\n\n${sectionContent}`;
  } else {
    // Other modules need imports from utils
    fileContent = `// ${split.description}\n// This file is part of the k_da application split from webpack bundle\n\nimport * as utils from './utils.js';\n\n${sectionContent}`;
  }

  fs.writeFileSync(outputPath, fileContent);
  console.log(`  Wrote ${outputPath} (${sectionLines.length} lines, ${(fileContent.length / 1024 / 1024).toFixed(2)} MB)`);
});

// Create an index.js that imports and runs everything
const indexContent = `#!/usr/bin/env node

// K_DA Application - Split Bundle Entry Point
// This file imports all split modules and runs the main application

import './utils.js';
import './react-bundle.js';
import './app-modules.js';
import './main.js';
`;

const indexPath = path.join(outputDir, 'index.js');
fs.writeFileSync(indexPath, indexContent);
fs.chmodSync(indexPath, '755');

console.log(`\n✅ Split complete!`);
console.log(`Output directory: ${outputDir}`);
console.log(`Files created: ${splits.length + 1}`);
console.log(`\nTo run the split version:`);
console.log(`  node ${indexPath}`);
