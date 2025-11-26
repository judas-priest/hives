#!/usr/bin/env node
/**
 * Update app_code.js to import i18n from separate files
 */
const fs = require('fs');
const path = require('path');

const APP_CODE_FILE = path.join(__dirname, '../k_da/src/04-app-code.js');

console.log('Reading app_code.js...');
const content = fs.readFileSync(APP_CODE_FILE, 'utf8');
const lines = content.split('\n');

// Find where to add imports (after the initial imports)
const importInsertIndex = lines.findIndex((line, idx) =>
  idx > 10 && line.startsWith('import ') && lines[idx + 1] && !lines[idx + 1].startsWith('import')
);

console.log('Insert imports at line:', importInsertIndex + 1);

// Add i18n imports
const i18nImports = [
  "import { enUS, ruRU } from './i18n/index.js';"
];

// Remove old i18n definitions (hDn and ADn)
const enStart = 6526; // var hDn = {
const enEnd = 7312;    // },
const ruStart = 7313;  // ADn = {
const ruEnd = 9401;    // };

console.log('Removing English i18n definition (lines', enStart + 1, '-', enEnd + 1, ')');
console.log('Removing Russian i18n definition (lines', ruStart + 1, '-', ruEnd + 1, ')');

// Create new content
const newLines = [
  ...lines.slice(0, importInsertIndex + 1),
  ...i18nImports,
  ...lines.slice(importInsertIndex + 1, enStart),
  '// i18n objects (enUS, ruRU) are imported from ./i18n/index.js',
  '// English locale (previously hDn)',
  'var hDn = enUS,',
  '// Russian locale (previously ADn)',
  '  ADn = ruRU;',
  ...lines.slice(ruEnd + 1)
];

const newContent = newLines.join('\n');

// Write updated content
console.log('Writing updated app_code.js...');
fs.writeFileSync(APP_CODE_FILE, newContent, 'utf8');

console.log('✓ Update complete!');
console.log('  - Added i18n import');
console.log('  - Replaced hDn and ADn definitions with imports');
console.log('  - Removed', (enEnd - enStart + 1) + (ruEnd - ruStart + 1), 'lines of inline i18n');
console.log('  - File size reduced significantly');
