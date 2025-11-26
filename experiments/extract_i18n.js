#!/usr/bin/env node
/**
 * Extract i18n objects from app_code.js to separate files
 */
const fs = require('fs');
const path = require('path');

const APP_CODE_FILE = path.join(__dirname, '../k_da/src/04-app-code.js');
const I18N_DIR = path.join(__dirname, '../k_da/src/i18n');
const LOCALES_DIR = path.join(I18N_DIR, 'locales');
const ASSETS_DIR = path.join(I18N_DIR, 'assets');

console.log('Reading app_code.js...');
const content = fs.readFileSync(APP_CODE_FILE, 'utf8');
const lines = content.split('\n');

// Extract English i18n (hDn) - lines 6527-7313 (0-indexed: 6526-7312)
console.log('Extracting English i18n...');
const enStart = 6526; // var hDn = {
const enEnd = 7312;    // },
const enLines = lines.slice(enStart, enEnd + 1);

// Extract the banner separately
const enBannerStart = enLines.findIndex(line => line.includes('banner: {'));
const enBannerEnd = enLines.findIndex((line, idx) => idx > enBannerStart && line.trim() === '},');
const enBannerLines = enLines.slice(enBannerStart + 1, enBannerEnd);

// Extract the large banner
const largeBannerStart = enBannerLines.findIndex(line => line.includes('large: `'));
const largeBannerEnd = enBannerLines.findIndex((line, idx) => idx > largeBannerStart && line.includes('`,'));
const largeBanner = enBannerLines.slice(largeBannerStart + 1, largeBannerEnd).map(l => l.replace(/^ {6}/, '')).join('\n');

// Extract the medium banner
const mediumBannerStart = enBannerLines.findIndex(line => line.includes('medium: `'));
const mediumBannerEnd = enBannerLines.findIndex((line, idx) => idx > mediumBannerStart && line.includes('`,'));
const mediumBanner = enBannerLines.slice(mediumBannerStart + 1, mediumBannerEnd).map(l => l.replace(/^ {6}/, '')).join('\n');

// Extract the small banner
const smallBannerStart = enBannerLines.findIndex(line => line.includes('small: `'));
const smallBannerEnd = enBannerLines.findIndex((line, idx) => idx > smallBannerStart && line.includes('`,'));
const smallBanner = enBannerLines.slice(smallBannerStart + 1, smallBannerEnd).map(l => l.replace(/^ {6}/, '')).join('\n');

// Save banners
console.log('Saving banner files...');
fs.writeFileSync(path.join(ASSETS_DIR, 'banner-large.txt'), largeBanner, 'utf8');
fs.writeFileSync(path.join(ASSETS_DIR, 'banner-medium.txt'), mediumBanner, 'utf8');
fs.writeFileSync(path.join(ASSETS_DIR, 'banner-small.txt'), smallBanner, 'utf8');

// Create English i18n object without banners
const enContent = `// English (US) locale
// Auto-generated from 04-app-code.js

export const enUS = ${enLines.join('\n').replace(/^var hDn = /, '').replace(/,\s*$/, ';')}
`;

fs.writeFileSync(path.join(LOCALES_DIR, 'en-US.js'), enContent, 'utf8');

// Extract Russian i18n (ADn) - lines 7314-9402 (0-indexed: 7313-9401)
console.log('Extracting Russian i18n...');
const ruStart = 7313; // ADn = {
const ruEnd = 9401;    // };
const ruLines = lines.slice(ruStart, ruEnd + 1);

const ruContent = `// Russian (RU) locale
// Auto-generated from 04-app-code.js

export const ruRU = ${ruLines.join('\n').replace(/^  ADn = /, '').replace(/;$/, ';')}
`;

fs.writeFileSync(path.join(LOCALES_DIR, 'ru-RU.js'), ruContent, 'utf8');

// Create index file for i18n
const indexContent = `// i18n configuration
// This module exports all available locales

import { enUS } from './locales/en-US.js';
import { ruRU } from './locales/ru-RU.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load banner assets
function loadBanner(size) {
  const bannerPath = join(__dirname, 'assets', \`banner-\${size}.txt\`);
  return readFileSync(bannerPath, 'utf8');
}

// Add banners to locale objects
enUS.banner = {
  large: loadBanner('large'),
  medium: loadBanner('medium'),
  small: loadBanner('small')
};

ruRU.banner = {
  large: loadBanner('large'),
  medium: loadBanner('medium'),
  small: loadBanner('small')
};

// Export locales with improved names
export { enUS, ruRU };

// Default locale
export const defaultLocale = enUS;

// Locale map
export const locales = {
  'en-US': enUS,
  'en': enUS,
  'ru-RU': ruRU,
  'ru': ruRU
};
`;

fs.writeFileSync(path.join(I18N_DIR, 'index.js'), indexContent, 'utf8');

console.log('✓ Extraction complete!');
console.log('  - English i18n:', path.join(LOCALES_DIR, 'en-US.js'));
console.log('  - Russian i18n:', path.join(LOCALES_DIR, 'ru-RU.js'));
console.log('  - Banners:', ASSETS_DIR);
console.log('  - Index:', path.join(I18N_DIR, 'index.js'));
