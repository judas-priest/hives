#!/usr/bin/env node

/**
 * Build script for K_DA
 * Concatenates split source files into a working executable
 * Inlines i18n data and environment variables from .env file
 *
 * Usage:
 *   node build.js              # Build with .env file (if exists)
 *   node build.js --no-env     # Build without .env substitution
 *   node build.js --inline-env # Inline all .env values (no runtime env access)
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const noEnv = args.includes('--no-env');
const inlineEnv = args.includes('--inline-env');

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
  .trim();

const ruRUObject = ruRUFile
  .replace(/^\/\/.*$/gm, '') // Remove comments
  .replace(/export const ruRU = /, 'const ruRU = ')
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

// Start with shebang
let output = shebang + '\n\n';

// Concatenate all source files
sourceFiles.forEach((file, index) => {
  console.log(`[${index + 1}/${sourceFiles.length}] Adding ${file}...`);
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the header comment (everything before the first non-comment line)
  content = content.replace(/^\/\*[\s\S]*?\*\/\s*/, '');

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
const outputPath = path.join(__dirname, 'k_da.js');
fs.writeFileSync(outputPath, output);
fs.chmodSync(outputPath, '755');

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`\n✓ Built ${outputPath} (${sizeMB} MB)`);
console.log('✓ i18n locale data inlined successfully');
if (envFileLoaded) {
  console.log(`✓ Environment variables from .env ${inlineEnv ? 'inlined' : 'set as defaults'}`);
}
console.log('\nTo run: ./k_da/k_da.js or node k_da/k_da.js');
