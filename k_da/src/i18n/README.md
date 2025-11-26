# Internationalization (i18n)

This directory contains all internationalization resources for the application, organized for better maintainability and readability.

## Directory Structure

```
i18n/
├── README.md           # This file
├── index.js            # Main i18n module with locale exports
├── locales/            # Locale-specific translations
│   ├── en-US.js        # English (US) translations
│   └── ru-RU.js        # Russian translations
└── assets/             # Shared assets used across locales
    ├── banner-large.txt    # Large ASCII art banner
    ├── banner-medium.txt   # Medium ASCII art banner
    └── banner-small.txt    # Small ASCII art banner
```

## Available Locales

- **English (US)** - `en-US` or `en`
- **Russian** - `ru-RU` or `ru`

## Usage

The i18n module exports locale objects with improved, readable names:

```javascript
import { enUS, ruRU } from './i18n/index.js';

// Use English locale
const messages = enUS;
console.log(messages.help.basics); // "Basics:"

// Use Russian locale
const messages = ruRU;
console.log(messages.help.basics); // "Основы:"
```

### Locale Selection

```javascript
import { locales } from './i18n/index.js';

// Get locale by code
const currentLocale = locales['en-US'];
const shortCode = locales['en']; // Same as 'en-US'
```

## Structure of Locale Objects

Each locale object contains:

- **banner** - ASCII art banners in three sizes (large, medium, small)
- **help** - Help text and instructions
- **commandMessages** - Messages for various commands
- **statsDisplay** - Statistics display text
- **sessionSummary** - Session summary messages
- **settings** - Settings descriptions and labels
- **menuTitles** - Menu and section titles
- **settingsConfig** - Settings configuration
- **statusIndicators** - Status indicator text
- **diffViewer** - Diff viewer text
- **errors** - Error messages
- **loading** - Loading activity messages
- And many more...

## ASCII Art Banners

The application logo is stored as plain text files in `assets/`:

- `banner-large.txt` - Full-size banner (851 bytes)
- `banner-medium.txt` - Medium banner (851 bytes)
- `banner-small.txt` - Compact banner (276 bytes)

These files are loaded dynamically by the i18n module and attached to locale objects.

## Variable Naming Improvements

In the original code, i18n objects had obfuscated names:
- `hDn` → `enUS` (English locale)
- `ADn` → `ruRU` (Russian locale)

The new names are more descriptive and follow common i18n naming conventions (language-COUNTRY format).

## Adding New Locales

To add a new locale:

1. Create a new file in `locales/` (e.g., `es-ES.js` for Spanish)
2. Export a locale object with the same structure as existing locales
3. Add the import and export in `index.js`
4. Add the locale to the `locales` map in `index.js`

Example:

```javascript
// locales/es-ES.js
export const esES = {
  banner: {}, // Will be filled by index.js
  help: {
    basics: 'Conceptos básicos:',
    // ... rest of translations
  },
  // ... rest of structure
};
```

## Benefits of This Structure

1. **Separation of Concerns** - i18n data is separate from application logic
2. **Readability** - Cyrillic text is in dedicated files, not mixed with code
3. **Maintainability** - Easy to find and update translations
4. **Reduced File Size** - 04-app-code.js is 2,870 lines smaller
5. **Better Variable Names** - `enUS` and `ruRU` are self-documenting
6. **Reusable Assets** - Banner files can be used independently
7. **Easy Extension** - Adding new locales is straightforward

## Technical Notes

- All locale files use ES6 module syntax (`export`)
- Banner files are loaded using Node.js `fs.readFileSync()`
- The module requires Node.js built-in modules (`fs`, `path`)
- Banner files use UTF-8 encoding
- Locale codes follow RFC 5646 (language-COUNTRY)
