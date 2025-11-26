# K_DA Split Structure

This directory contains the k_da application split into multiple files for better maintainability.

## File Structure

```
k_da/
├── index.js                 # Main entry point (run this file)
├── src/
│   ├── webpack-runtime.js   # Webpack module system (~1.5 KB)
│   ├── react-bundle.js      # React library (~652 KB)
│   ├── npm-modules.js       # NPM dependencies (~7.8 MB)
│   ├── app-code.js          # Application code (~1.2 MB)
│   └── main.js              # Entry function (~4.4 KB)
├── k_da_deobfuscated.js  # Original deobfuscated file (kept for reference)
├── .env.example             # Environment variables reference
├── README.md                # Application documentation
└── SPLIT_STRUCTURE.md       # This file
```

## Load Order

The files must be loaded in this exact order:

1. **webpack-runtime.js** - Sets up the webpack module system
2. **react-bundle.js** - Loads React library
3. **npm-modules.js** - Loads third-party dependencies
4. **app-code.js** - Loads application-specific code
5. **main.js** - Runs the main entry function

The `index.js` file handles loading all modules in the correct order.

## File Details

### webpack-runtime.js
- Lines 6-39 from original
- Object utilities and module system helpers
- Webpack module loader (T function)
- ES module compatibility layer

### react-bundle.js
- Lines 39-20,500 from original
- Complete React 19.1.0 library bundle
- React JSX runtime
- React hooks and components

### npm-modules.js
- Lines 20,500-242,191 from original
- All bundled npm packages
- Third-party dependencies (emoji regex, websockets, etc.)
- Utility libraries

### app-code.js
- Lines 242,191-278,186 from original
- Node.js imports (stream, process, etc.)
- Application helper functions
- Configuration utilities
- Authentication handlers

### main.js
- Lines 278,186-278,315 from original
- Main async function `$ur()`
- Application bootstrap and initialization
- CLI argument parsing
- Interactive mode setup

## Usage

Run the application using:

```bash
./k_da/index.js [options]
# or
node k_da/index.js [options]
```

All command-line options from the original k_da.js are supported.

## Notes

- All files are interdependent and rely on shared closure scope
- The split maintains the original webpack bundle structure
- Original line numbers are preserved in file headers for reference
- Files must be loaded in the specified order for the application to work
- The split reduces the size of individual files for easier navigation
- See README.md for full application documentation and usage instructions
- See .env.example for environment variable configuration

## Development

The split structure makes it easier to:
- Navigate and understand the codebase
- Identify which layer a function belongs to
- Debug issues by isolating different parts
- Understand dependencies between modules

However, note that:
- Variable names are still obfuscated from the original webpack bundle
- Cross-file dependencies exist due to the webpack closure scope
- Modifying individual files may break functionality due to interdependencies
