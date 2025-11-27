#!/usr/bin/env bun

/**
 * Build script for K_DA
 * Concatenates split source files into a working executable
 * Inlines i18n data and environment variables from .env file
 *
 * Usage:
 *   bun build.js              # Build with .env file (if exists)
 *   bun build.js --no-env     # Build without .env substitution
 *   bun build.js --inline-env # Inline all .env values (no runtime env access)
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const noEnv = args.includes('--no-env');
const inlineEnv = args.includes('--inline-env');

console.log('Building k_da.js from split sources...\n');

// Remove old build to avoid caching
const outputPath = path.join(__dirname, 'k_da.js');
if (fs.existsSync(outputPath)) {
  console.log('Removing old k_da.js to avoid cache conflicts...');
  fs.unlinkSync(outputPath);
}

// Files to concatenate in order
const sourceFiles = [
  'src/00-shebang.js',
  'src/01-webpack-runtime.js',
  'src/02-react-bundle.js',
  'src/03-npm-modules.js',
  'src/04-app-code.js',
  'src/05-main.js',
];

// Load .env file if it exists
let envVars = {};
let envFileLoaded = false;
if (!noEnv) {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading .env file...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      // Parse KEY=VALUE format
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        let [, key, value] = match;
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    envFileLoaded = true;
    console.log(`   → Loaded ${Object.keys(envVars).length} environment variables from .env`);
  } else {
    console.log('No .env file found (using runtime environment variables)');
  }
}

// Read i18n locale files and convert to inline objects
console.log('Loading i18n locale data...');
const enUSFile = fs.readFileSync(path.join(__dirname, 'src/i18n/locales/en-US.js'), 'utf8');
const ruRUFile = fs.readFileSync(path.join(__dirname, 'src/i18n/locales/ru-RU.js'), 'utf8');

// Extract the object definitions (remove export statements)
const enUSObject = enUSFile
  .replace(/^\/\/.*$/gm, '') // Remove comments
  .replace(/export const enUS = /, 'const enUS = ')
  .replace(/},\s*$/, '};') // Fix trailing comma (should be semicolon)
  .trim();

const ruRUObject = ruRUFile
  .replace(/^\/\/.*$/gm, '') // Remove comments
  .replace(/export const ruRU = /, 'const ruRU = ')
  .replace(/},\s*$/, '};') // Fix trailing comma (should be semicolon)
  .trim();

// Helper function to inline environment variables
function inlineEnvironmentVariables(content) {
  if (!envFileLoaded) return content;

  console.log('   → Inlining environment variables from .env...');
  let replacements = 0;

  if (inlineEnv) {
    // Inline mode: Replace process.env.VAR with actual values
    Object.entries(envVars).forEach(([key, value]) => {
      // Create a safe string literal (escape special characters)
      const safeValue = JSON.stringify(value);

      // Replace process.env.KEY with the actual value
      const pattern = new RegExp(`process\\.env\\.${key}(?![A-Z0-9_])`, 'g');
      const beforeCount = (content.match(pattern) || []).length;
      if (beforeCount > 0) {
        content = content.replace(pattern, safeValue);
        replacements += beforeCount;
      }
    });
    console.log(`   → Inlined ${replacements} environment variable references`);
  } else {
    // Default mode: Inject default values using ||
    Object.entries(envVars).forEach(([key, value]) => {
      const safeValue = JSON.stringify(value);

      // Replace process.env.KEY with (process.env.KEY || "default_value")
      const pattern = new RegExp(`process\\.env\\.${key}(?![A-Z0-9_])`, 'g');
      const beforeCount = (content.match(pattern) || []).length;
      if (beforeCount > 0) {
        content = content.replace(pattern, `(process.env.${key} || ${safeValue})`);
        replacements += beforeCount;
      }
    });
    console.log(`   → Set default values for ${replacements} environment variable references`);
  }

  return content;
}

// Start with empty output (shebang will come from 00-shebang.js)
let output = '';

// Concatenate all source files
sourceFiles.forEach((file, index) => {
  console.log(`[${index + 1}/${sourceFiles.length}] Adding ${file}...`);
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the header comment (everything before the first non-comment line)
  content = content.replace(/^\/\*[\s\S]*?\*\/\s*/, '');

  // Special handling for 00-shebang.js - add proper spacing after it
  if (file === 'src/00-shebang.js') {
    output += content + '\n\n';
    return;
  }

  // Special handling for 04-app-code.js - replace i18n import with inline data
  if (file === 'src/04-app-code.js') {
    console.log('   → Inlining i18n locale data...');

    // Remove the import statement for i18n
    content = content.replace(
      /import \{ enUS, ruRU \} from ['"]\.\/i18n\/index\.js['"];?\s*/,
      ''
    );

    // Find where to insert the i18n objects (before var hDn = enUS)
    // Look for the comment about i18n objects or the variable assignment
    let i18nCommentIndex = content.indexOf('// i18n objects (enUS, ruRU)');
    if (i18nCommentIndex === -1) {
      // Try to find var hDn = enUS or similar patterns
      i18nCommentIndex = content.search(/var\s+\w+\s*=\s*enUS/);
      if (i18nCommentIndex === -1) {
        console.warn('   ⚠ Warning: Could not find i18n insertion point, appending at start');
        i18nCommentIndex = 0;
      }
    }

    // Insert the i18n objects
    const i18nInline = `// === Inlined i18n locale data ===
// These objects were extracted from the i18n module during build
${enUSObject}

${ruRUObject}

`;
    content = content.slice(0, i18nCommentIndex) + i18nInline + content.slice(i18nCommentIndex);

    // Remove old hard-coded i18n objects from the app code
    // This prevents duplicate i18n data and ensures changes to locale files are applied
    console.log('   → Removing old hard-coded i18n objects from app code...');

    // Pattern to find the old English locale object (var hDn={help:{basics:)
    const oldEnPattern = /var\s+\w{3}\s*=\s*\{help:\{basics:/;
    const enMatch = content.match(oldEnPattern);
    if (enMatch) {
      const startPos = enMatch.index;
      // Find the matching closing brace for this object
      let braceCount = 0;
      let pos = content.indexOf('{', startPos);
      let foundEnd = false;

      while (pos < content.length && !foundEnd) {
        const char = content[pos];
        // Skip string content to avoid counting braces inside strings
        if (char === '"' || char === "'" || char === '`') {
          const quote = char;
          pos++;
          while (pos < content.length && content[pos] !== quote) {
            if (content[pos] === '\\') pos++; // Skip escaped characters
            pos++;
          }
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Found the end, remove this entire variable declaration
            let endPos = pos + 1;
            // Skip any trailing semicolons or commas
            while (endPos < content.length && (content[endPos] === ';' || content[endPos] === ',')) {
              endPos++;
            }
            content = content.slice(0, startPos) + content.slice(endPos);
            console.log('   → Removed old English locale object');
            foundEnd = true;
          }
        }
        pos++;
      }
    }

    // Pattern to find the old Russian locale object (can be "var ADn=" or just "ADn=")
    const oldRuPattern = /(var\s+)?([A-Z][a-zA-Z0-9]{2})\s*=\s*\{help:\{basics:/;
    const ruMatch = content.match(oldRuPattern);
    if (ruMatch) {
      const startPos = ruMatch.index;
      let braceCount = 0;
      let pos = content.indexOf('{', startPos);
      let foundEnd = false;

      while (pos < content.length && !foundEnd) {
        const char = content[pos];
        // Skip string content to avoid counting braces inside strings
        if (char === '"' || char === "'" || char === '`') {
          const quote = char;
          pos++;
          while (pos < content.length && content[pos] !== quote) {
            if (content[pos] === '\\') pos++; // Skip escaped characters
            pos++;
          }
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            let endPos = pos + 1;
            while (endPos < content.length && (content[endPos] === ';' || content[endPos] === ',')) {
              endPos++;
            }
            content = content.slice(0, startPos) + content.slice(endPos);
            console.log('   → Removed old Russian locale object');
            foundEnd = true;
          }
        }
        pos++;
      }
    }

    // Apply environment variable inlining/defaults
    content = inlineEnvironmentVariables(content);
  }

  output += content;

  // Add separator comment between files
  if (index < sourceFiles.length - 1) {
    output += '\n// === End of ' + file + ' ===\n\n';
  }
});

// Write the built file
fs.writeFileSync(outputPath, output);
fs.chmodSync(outputPath, '755');

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`\n✓ Built ${outputPath} (${sizeMB} MB)`);
console.log('✓ i18n locale data inlined successfully');
if (envFileLoaded) {
  console.log(`✓ Environment variables from .env ${inlineEnv ? 'inlined' : 'set as defaults'}`);
}
console.log('\nTo run: ./k_da/k_da.js or bun k_da/k_da.js');
