# K_DA Source Files (Split for Readability)

This directory contains the k_da application split into logical sections for easier reading and navigation.

## ⚠️ Important Notes

- **These files cannot run independently** - they are part of a webpack bundle that shares closure scope
- **To create a working executable**, use the build script: `node ../build.js`
- The split is purely for readability and code navigation
- All files must be combined in order to function

## File Structure

1. **01-webpack-runtime.js** (0.00 MB, lines 6-38)
   - Webpack module system and runtime utilities

2. **02-react-bundle.js** (0.64 MB, lines 39-20500)
   - React library bundle (v19.1.0)

3. **03-npm-modules.js** (7.71 MB, lines 20501-242191)
   - Bundled npm packages and dependencies

4. **04-app-code.js** (1.20 MB, lines 242192-278185)
   - Application code, helpers, and configuration

5. **05-main.js** (0.00 MB, lines 278186-278315)
   - Main entry function and bootstrap

## How to Use

### For Reading/Understanding the Code

Just open the files in your editor. Each file corresponds to a logical section of the application:

- `01-webpack-runtime.js` - Start here to understand the module system
- `02-react-bundle.js` - React library code
- `03-npm-modules.js` - Third-party npm packages
- `04-app-code.js` - Main application logic, authentication, CLI, etc.
- `05-main.js` - Entry point and bootstrap

### For Running the Application

1. Build the executable:
   ```bash
   cd k_da
   node build.js
   ```

2. Run the built file:
   ```bash
   ./k_da.js [options]
   # or
   node k_da.js [options]
   ```

## Why This Structure?

The original `k_da_deobfuscated.js` is 278,000+ lines and 9.5 MB, making it difficult to navigate in most editors. This split:

- ✅ Makes it easier to find specific functionality
- ✅ Allows you to focus on one section at a time
- ✅ Provides clear boundaries between React, npm modules, and app code
- ✅ Maintains the original functionality through the build process

## Line Number Reference

Each file header shows the original line numbers from `k_da_deobfuscated.js`, making it easy to cross-reference with any documentation or error messages.
