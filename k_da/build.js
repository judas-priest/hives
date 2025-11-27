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

// Check if Polza AI integration should be included
const polzaApiKey = envVars.POLZA_API_KEY;
const shouldIncludePolza = !!polzaApiKey;

if (shouldIncludePolza) {
  console.log('   → Polza AI integration detected - including client');
} else {
  console.log('   → Polza AI integration not detected - skipping');
}

// Create Polza AI client code for inline inclusion
const polzaClientCode = `
// === Polza AI Client Integration ===
// Generated during build process

class PolzaAIClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.POLZA_API_KEY;
    this.baseUrl = config.baseUrl || process.env.POLZA_API_BASE || 'https://api.polza.ai/api/v1';
    this.defaultModel = config.model || process.env.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5';
    this.temperature = parseFloat(config.temperature || process.env.POLZA_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(config.maxTokens || process.env.POLZA_MAX_TOKENS || '4096');
    this.enableStreaming = config.enableStreaming !== false;
    this.enableReasoning = config.enableReasoning === true;
    this.reasoningEffort = config.reasoningEffort || process.env.POLZA_REASONING_EFFORT || 'high';

    if (!this.apiKey) {
      throw new Error('Polza AI API key not provided. Set POLZA_API_KEY environment variable.');
    }
  }

  async createChatCompletion(messages, options = {}) {
    const url = this.baseUrl + '/chat/completions';

    const requestBody = {
      model: options.model || this.defaultModel,
      messages: messages,
      temperature: options.temperature ?? this.temperature,
      max_tokens: options.maxTokens ?? this.maxTokens,
      stream: options.stream ?? false,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
      ...(this.enableReasoning && {
        reasoning: {
          effort: options.reasoningEffort || this.reasoningEffort,
          max_tokens: options.reasoningMaxTokens || 2000
        }
      })
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json',
          ...(options.stream && { 'Accept': 'text/event-stream' })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          'Polza AI API Error (' + response.status + '): ' + (error.error?.message || response.statusText)
        );
      }

      return response.json();
    } catch (error) {
      console.error('Polza AI Request failed:', error.message);
      throw error;
    }
  }

  async listModels() {
    const url = this.baseUrl + '/models';

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models: ' + response.statusText);
      }

      return response.json();
    } catch (error) {
      console.error('Polza AI Models request failed:', error.message);
      throw error;
    }
  }

  // Convenience method for simple completions
  async complete(prompt, options = {}) {
    const messages = [{ role: 'user', content: prompt }];
    const response = await this.createChatCompletion(messages, options);
    return response.choices?.[0]?.message?.content || '';
  }
}

// Polza AI integration helper
const polzaAI = {
  client: null,
  
  init(config = {}) {
    if (!this.client) {
      try {
        this.client = new PolzaAIClient(config);
        console.log('✅ Polza AI client initialized');
      } catch (error) {
        console.warn('⚠️ Polza AI initialization failed:', error.message);
      }
    }
    return this.client;
  },
  
  isAvailable() {
    return !!this.client;
  },
  
  async complete(prompt, options = {}) {
    if (!this.client) {
      throw new Error('Polza AI client not initialized');
    }
    return this.client.complete(prompt, options);
  },
  
  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Polza AI client not initialized');
    }
    return this.client.createChatCompletion(messages, options);
  }
};

// Export for use in CLI
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PolzaAIClient, polzaAI };
}
`;

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
    // BUT: Don't wrap when it's on the left side of an assignment (process.env.X = value)
    Object.entries(envVars).forEach(([key, value]) => {
      const safeValue = JSON.stringify(value);

      // Replace process.env.KEY with (process.env.KEY || "default_value")
      // Use negative lookbehind to avoid left-hand assignment: (?<!process\.env\.KEY)\s*=
      // But since JS doesn't support complex lookbehinds well, we'll use a smarter replacement
      const pattern = new RegExp(`process\\.env\\.${key}(?![A-Z0-9_]|\\s*=)`, 'g');
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

    // Find where to insert the i18n objects
    // Priority 1: Look for existing i18n comment marker
    let i18nCommentIndex = content.indexOf('// i18n objects (enUS, ruRU)');

    if (i18nCommentIndex === -1) {
      // Priority 2: Try to find var hDn = enUS or similar patterns (freshly split files)
      i18nCommentIndex = content.search(/var\s+\w+\s*=\s*enUS/);
    }

    if (i18nCommentIndex === -1) {
      // Priority 3: Find last import statement and insert after it
      const imports = Array.from(content.matchAll(/^import\s+.+?;?\s*$/gm));
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        i18nCommentIndex = lastImport.index + lastImport[0].length;
        console.log('   → Inserting i18n data after last import statement');
      } else {
        // Priority 4: Find first top-level variable declaration
        // This is a safe insertion point as it's at the statement level, not inside an expression
        const firstVarMatch = content.search(/^var [a-zA-Z]/m);
        if (firstVarMatch > 0) {
          i18nCommentIndex = firstVarMatch;
          console.log('   → Inserting i18n data before first variable declaration');
        } else {
          // Priority 5: Insert after the file header comment
          const headerEndMatch = content.match(/\*\/\s*\n/);
          if (headerEndMatch) {
            i18nCommentIndex = headerEndMatch.index + headerEndMatch[0].length;
            console.log('   → Inserting i18n data after file header');
          } else {
            // Priority 6: Find first actual code line (last resort)
            const firstCodeMatch = content.search(/^[^\s\/\n]/m);
            i18nCommentIndex = firstCodeMatch > 0 ? firstCodeMatch : 0;
            console.log('   → Inserting i18n data at beginning of code');
          }
        }
      }
    }

    // Insert the i18n objects
    const i18nInline = `// === Inlined i18n locale data ===
// These objects were extracted from the i18n module during build
${enUSObject}

${ruRUObject}

`;

    // Prepare inline content
    let inlineContent = i18nInline;

    // Add Polza AI integration if API key is present
    if (shouldIncludePolza) {
      const polzaInline = `// === Polza AI Integration ===
// Auto-included during build because POLZA_API_KEY is set
${polzaClientCode}

`;
      inlineContent += polzaInline;
      console.log('   → Polza AI client code inlined successfully');
    }

    content = content.slice(0, i18nCommentIndex) + inlineContent + content.slice(i18nCommentIndex);

    // Remove old hard-coded i18n objects from the app code
    // This prevents duplicate i18n data and ensures changes to locale files are applied
    console.log('   → Removing old hard-coded i18n objects from app code...');

        // Remove English locale object (var hDn = { ... })
    const oldEnPattern = /var\s+hDn\s*=\s*\{/;
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

    // Remove Russian locale object (ADn = { ... })
    const oldRuPattern = /\bADn\s*=\s*\{/;
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

    // Fix references to deleted locale objects
    console.log('   → Fixing references to deleted locale objects...');
    let referenceFixes = 0;
    
    // Replace references to hDn with enUS
    content = content.replace(/\bhDn\b/g, () => {
      referenceFixes++;
      return 'enUS';
    });
    
    // Replace references to ADn with ruRU
    content = content.replace(/\bADn\b/g, () => {
      referenceFixes++;
      return 'ruRU';
    });

    // Fix variable declaration for nXt (add const if missing)
    content = content.replace(
      /(\s+)nXt\s*=\s*\{\s*en:\s*enUS,\s*ru:\s*ruRU\s*\}/,
      '$1const nXt = { en: enUS, ru: ruRU }'
    );
    
    if (referenceFixes > 0) {
      console.log(`   → Fixed ${referenceFixes} references to deleted locale objects`);
    }

    // === Polza AI Build-Time Integration ===
    // Replace API routing code at build-time when POLZA_API_KEY is set
    if (shouldIncludePolza) {
      console.log('   → Applying Polza AI build-time integration...');

      const polzaApiBase = envVars.POLZA_API_BASE || 'https://api.polza.ai/api/v1';
      const polzaModel = envVars.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5';

      // Replace ZMn() function to return Polza API endpoint
      // Match the exact function definition to avoid over-matching
      const zmnPattern = /function ZMn\(\) \{[\s\n]*return `\$\{process\.env\.KODA_API_BASE \|\| ['"]https:\/\/api\.kodacode\.ru['"]\}\/ftc`;[\s\n]*\}/;
      const zmnReplacement = `function ZMn() {\n  // Polza AI integration (configured at build-time)\n  return ${JSON.stringify(polzaApiBase)};\n}`;

      if (content.match(zmnPattern)) {
        content = content.replace(zmnPattern, zmnReplacement);
        console.log('   → Replaced ZMn() to use Polza API endpoint');
      } else {
        console.warn('   ⚠ Warning: Could not find ZMn() function to replace');
      }

      // Replace rqe() function to skip GitHub token auth for Polza
      // Match from function start to the next top-level statement (var/function)
      const rqePattern = /async function rqe\(\) \{[\s\S]*?\n\}\nvar /;
      const rqeReplacement = `async function rqe() {\n  // Polza AI integration: Use Polza API key authentication (configured at build-time)\n  // No GitHub token needed - Polza manages its own authentication\n  return { count: 0, limit: 999999, remaining: 999999 };\n}\nvar `;

      if (content.match(rqePattern)) {
        content = content.replace(rqePattern, rqeReplacement);
        console.log('   → Replaced rqe() to use Polza authentication');
      } else {
        console.warn('   ⚠ Warning: Could not find rqe() function to replace');
      }

      console.log('   → Polza AI build-time integration complete');
      console.log(`   → Using Polza API: ${polzaApiBase}`);
      console.log(`   → Default model: ${polzaModel}`);
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
if (shouldIncludePolza) {
  console.log('✓ Polza AI integration included in build');
} else {
  console.log('ℹ️  Polza AI integration not included (no API key found)');
}
console.log('\nTo run: ./k_da/k_da.js or bun k_da/k_da.js');
