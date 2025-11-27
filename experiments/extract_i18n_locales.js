#!/usr/bin/env node

/**
 * Extract i18n locale objects from 04-app-code.js
 * Creates en-US.js and ru-RU.js locale files for the build process
 */

const fs = require('fs');
const path = require('path');

console.log('=== Extracting i18n locale objects ===\n');

const kdaDir = path.join(__dirname, '../k_da');
const appCodePath = path.join(kdaDir, 'src/04-app-code.js');
const i18nLocalesDir = path.join(kdaDir, 'src/i18n/locales');

// Create directory
fs.mkdirSync(i18nLocalesDir, { recursive: true });

// Read 04-app-code.js
const content = fs.readFileSync(appCodePath, 'utf8');

// Function to extract an object starting from a position
function extractObject(content, startPos) {
  let braceCount = 0;
  let pos = content.indexOf('{', startPos);
  let inString = false;
  let stringChar = null;
  let result = '';

  while (pos < content.length) {
    const char = content[pos];

    // Handle strings
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && content[pos - 1] !== '\\') {
      inString = false;
      stringChar = null;
    }

    // Count braces outside of strings
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          result = content.substring(content.indexOf('{', startPos), pos + 1);
          return result;
        }
      }
    }

    pos++;
  }

  return result;
}

// Extract English locale (var hDn = { ... })
console.log('Extracting English locale (hDn)...');
const hDnMatch = content.match(/var hDn\s*=\s*\{/);
if (!hDnMatch) {
  console.error('Could not find hDn object!');
  process.exit(1);
}

const enUSObject = extractObject(content, hDnMatch.index);
if (!enUSObject) {
  console.error('Could not extract hDn object!');
  process.exit(1);
}

// Extract Russian locale (ADn = { ... })
console.log('Extracting Russian locale (ADn)...');
const aDnMatch = content.match(/\s+ADn\s*=\s*\{/);
if (!aDnMatch) {
  console.error('Could not find ADn object!');
  process.exit(1);
}

const ruRUObject = extractObject(content, aDnMatch.index);
if (!ruRUObject) {
  console.error('Could not extract ADn object!');
  process.exit(1);
}

// Create en-US.js
const enUSContent = `// English (US) locale for k_da
// Extracted from 04-app-code.js

export const enUS = ${enUSObject};
`;

fs.writeFileSync(path.join(i18nLocalesDir, 'en-US.js'), enUSContent);
console.log(`✓ Created en-US.js (${(enUSContent.length / 1024).toFixed(2)} KB)`);

// Create ru-RU.js
const ruRUContent = `// Russian (RU) locale for k_da
// Extracted from 04-app-code.js

export const ruRU = ${ruRUObject};
`;

fs.writeFileSync(path.join(i18nLocalesDir, 'ru-RU.js'), ruRUContent);
console.log(`✓ Created ru-RU.js (${(ruRUContent.length / 1024).toFixed(2)} KB)`);

console.log('\n=== Locale files created successfully! ===\n');
