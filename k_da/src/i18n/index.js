// i18n configuration
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
  const bannerPath = join(__dirname, 'assets', `banner-${size}.txt`);
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
