# K_DA Deobfuscation Report

## Overview

This document describes the deobfuscation and unminification process applied to `k_da/k_da.js`.

## Original File Characteristics

- **File**: `k_da/k_da.js`
- **Original Size**: 6.31 MB
- **Original Lines**: 2,039 lines
- **State**: Heavily minified and obfuscated
- **Bundler**: Webpack
- **Format**: ES Module with Node.js shebang

### Obfuscation Patterns Identified

1. **Variable Name Mangling**: Short, non-descriptive variable names (e.g., `ocr`, `oK`, `lcr`, `ucr`)
2. **Single-line Code**: All code compressed into minimal lines with very long line lengths (up to 29,633 characters)
3. **Webpack Bundle**: Code bundled using webpack module system
4. **Terser Minification**: Evidence of terser or similar minification tool
5. **No Whitespace**: Minimal whitespace and newlines removed
6. **Symbol Obfuscation**: Function and variable names replaced with short identifiers

## Deobfuscation Process

### Tools Used

- **Prettier** (v3.x): JavaScript code formatter
- **Node.js**: JavaScript runtime for executing deobfuscation script

### Steps Performed

1. **Code Beautification**
   - Applied Prettier formatting with the following configuration:
     - Parser: `babel`
     - Print Width: 100 characters
     - Tab Width: 2 spaces
     - Semicolons: Always
     - Single Quotes: Enabled
     - Trailing Commas: ES5 style
     - Arrow Parens: Always

2. **Formatting Results**
   - Proper indentation added
   - Line breaks inserted at logical boundaries
   - Consistent spacing around operators and braces
   - Improved code structure visibility

### Results

- **Deobfuscated Size**: 9.55 MB (+51% increase)
- **Deobfuscated Lines**: 278,315 lines (+13,544% increase)
- **Readability**: Significantly improved
- **Functionality**: Preserved (executable and functionally identical)

## Code Analysis

### Application Type

The deobfuscated code reveals this is a **CLI application** with the following characteristics:

- **Application Name**: Koda / KodaAgent
- **Framework**: Node.js with React components
- **Purpose**: Interactive CLI tool with authentication support
- **Key Features**:
  - User prompts and interactive mode
  - Authentication system (GitHub login, external auth)
  - Configuration management
  - Theme support
  - Extension system
  - Sandbox mode
  - IDE integration (experimental Zed integration)
  - DNS resolution configuration

### Major Dependencies Identified

- **React** (v19.1.0): UI component framework
- **React JSX Runtime**: For JSX rendering
- Various npm modules bundled via webpack

### Code Structure

The deobfuscated code follows this general structure:

1. **Shebang and Module Setup** (lines 1-5)
   - Node.js shebang for CLI execution
   - ES Module imports setup
   - Global variable initialization

2. **Object Utilities** (lines 6-38)
   - Object manipulation helpers
   - Module system compatibility layer

3. **React Bundle** (lines 39-large section)
   - React library code
   - React components and hooks
   - React development and production modes

4. **Application Code** (remaining sections)
   - CLI application logic
   - Configuration handling
   - Authentication flows
   - Interactive mode
   - Command processing

## Limitations

While the deobfuscation significantly improves readability, some limitations remain:

1. **Variable Names**: Short, mangled variable names remain (e.g., `ocr`, `Te`, `Oe`)
2. **Function Names**: Many functions have obfuscated names
3. **Comments**: No comments were present in the original code
4. **Semantic Understanding**: Without source maps, original variable names cannot be recovered

## Files Generated

- `k_da/k_da.js` - **Deobfuscated version** (replaces original)
- `k_da/k_da_deobfuscated.js` - Backup deobfuscated version
- `k_da/k_da.js.minified.backup` - Backup of original minified file
- `experiments/deobfuscate.js` - Deobfuscation script used
- `k_da/DEOBFUSCATION_REPORT.md` - This report
- `k_da/.env.example` - Environment variables reference
- `k_da/README.md` - Comprehensive documentation

## Verification

The deobfuscated code:
- ✅ Maintains the same shebang for CLI execution
- ✅ Preserves all imports and module structure
- ✅ Retains identical functionality
- ✅ Remains executable
- ✅ File size increase is expected due to formatting

## Post-Deobfuscation Documentation

Following the initial deobfuscation, comprehensive documentation has been created to address the issue requirements:

### 1. Environment Variables Documentation

A complete `.env.example` file has been created documenting all 140+ environment variables used by the application, organized into categories:

- Core Application Settings
- Koda-Specific Configuration
- Authentication & OAuth
- Google Cloud & AI Configuration
- AWS Configuration
- gRPC Configuration
- Proxy Configuration
- Sandbox Configuration
- IDE Integration
- Terminal & Display
- OpenTelemetry
- And more...

Each variable includes:
- Description of purpose
- Example values
- Related variables
- Usage context

### 2. Comprehensive README Documentation

A detailed `README.md` has been created covering:

- Application overview and features
- Architecture and technology stack
- Installation instructions
- Configuration options
- Usage examples (basic and advanced)
- Authentication methods (GitHub, API Key, Vertex AI, etc.)
- IDE integration setup
- Sandbox mode configuration
- Development guidelines
- Troubleshooting guide
- Code structure reference

### 3. Module Splitting Analysis

**Decision: Module splitting not performed**

After thorough analysis, splitting the webpack bundle into multiple files was deemed impractical for the following reasons:

1. **Webpack Module System**: All modules are compiled into a single, interdependent bundle
2. **Shared Closure Scope**: Many variables and functions rely on shared closure scope across the entire file
3. **Cross-References**: Heavy interdependencies throughout the codebase
4. **Minified Variable Names**: Name collisions would occur if split due to short, mangled identifiers
5. **Functionality Risk**: Splitting would likely break the application's execution
6. **No Source Maps**: Cannot recover original module boundaries without source maps

**Alternative Approach**: Instead of splitting files, comprehensive documentation has been provided to make the codebase accessible and understandable:

- Environment variable reference for configuration
- Complete usage documentation
- Architecture overview
- Code structure mapping by line ranges
- Troubleshooting guides

This approach maintains the working application while providing all necessary information for understanding and using the deobfuscated code.

## Environment Variables Discovered

The analysis identified 140 unique environment variables used throughout the application:

### Authentication & API (8 variables)
- KODA_API_KEY, KODA_API_BASE, KODA_GITHUB_TOKEN, LOGIN_WITH_GITHUB, GITHUB_TOKEN, OAUTH_CALLBACK_HOST, OAUTH_CALLBACK_PORT, GEMINI_DEFAULT_AUTH_TYPE

### Google Cloud (20+ variables)
- GOOGLE_API_KEY, GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GCE_METADATA_HOST, GAE_SERVICE, K_SERVICE, FUNCTION_NAME, and more

### AWS (5 variables)
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, AWS_REGION, AWS_DEFAULT_REGION

### gRPC (8 variables)
- GRPC_VERBOSITY, GRPC_NODE_VERBOSITY, GRPC_TRACE, GRPC_NODE_TRACE, GRPC_SSL_CIPHER_SUITES, GRPC_DEFAULT_SSL_ROOTS_FILE_PATH, and more

### Sandbox (10+ variables)
- SANDBOX, BUILD_SANDBOX, SANDBOX_ENV, SANDBOX_FLAGS, SANDBOX_MOUNTS, SANDBOX_PORTS, GEMINI_SANDBOX, GEMINI_SANDBOX_IMAGE, and more

### IDE Integration (10+ variables)
- KODA_CLI_IDE_SERVER_PORT, KODA_CLI_IDE_WORKSPACE_PATH, JETBRAINS_IDE, CURSOR_TRACE_ID, CODESPACES, CLOUD_SHELL, and more

### Development & Debug (10+ variables)
- DEBUG, DEBUG_AUTH, DEBUG_PORT, NODE_ENV, NODE_DEBUG, NODE_OPTIONS, and more

### Network & Proxy (8 variables)
- HTTP_PROXY, HTTPS_PROXY, NO_PROXY, grpc_proxy, no_grpc_proxy, and more

See `.env.example` for complete reference.

## Conclusion

The deobfuscation process successfully transformed the heavily minified `k_da.js` file into a readable, well-formatted version with proper indentation and line breaks. While variable names remain obfuscated due to the lack of source maps, the code structure is now significantly more accessible for analysis, debugging, and understanding.

The file size increase from 6.31 MB to 9.55 MB is expected and acceptable, as it reflects the addition of whitespace, line breaks, and proper formatting that were stripped during the original minification process.

### File Splitting Implementation

After initial analysis suggested that splitting the webpack bundle was impractical, a pragmatic solution was implemented that balances readability with functionality:

**Strategy**: Split for Readability + Build Script

The 278,000+ line deobfuscated file has been split into 5 logical files:

1. **src/01-webpack-runtime.js** (33 lines, ~1.5 KB)
   - Webpack module system utilities
   - Lines 6-38 from original

2. **src/02-react-bundle.js** (20,462 lines, ~652 KB)
   - Complete React 19.1.0 library
   - Lines 39-20,500 from original

3. **src/03-npm-modules.js** (221,691 lines, ~7.8 MB)
   - All bundled npm packages
   - Lines 20,500-242,191 from original

4. **src/04-app-code.js** (35,994 lines, ~1.2 MB)
   - Application logic and configuration
   - Lines 242,191-278,185 from original

5. **src/05-main.js** (130 lines, ~4.4 KB)
   - Main entry function and bootstrap
   - Lines 278,186-278,315 from original

**Build Process**:
- Files cannot run independently (shared webpack closure scope)
- Build script (`build.js`) concatenates all files in order
- Produces functionally identical executable (`k_da.js`)
- Maintains all original functionality

**Benefits**:
- ✅ Easier navigation and code reading
- ✅ Logical separation of concerns
- ✅ Smaller files load faster in editors
- ✅ Clear boundaries between React, npm modules, and app code
- ✅ Original line numbers preserved in file headers
- ✅ Working executable through build process

See `SPLIT_STRUCTURE.md` and `src/README.md` for detailed documentation.

### Next Steps Completion Status

As per issue #5 requirements, the following next steps have been completed:

- ✅ **Split the file into multiple files**: Successfully split into 5 logical files with build script
- ✅ **Output .env**: Complete `.env.example` created with 140+ documented environment variables
- ✅ **Write documentation**: Comprehensive `README.md` created covering all aspects of the application
- ✅ **Move variables to configuration file**: Extracted hardcoded URLs and moved to environment variables

### Configuration Externalization

Following the requirement to "move the variables to the configuration file", the following hardcoded values have been externalized to environment variables:

**Koda Service URLs:**
- `KODA_SITE_URL` - Main Koda website (default: https://kodacode.ru)
- `KODA_DOCS_URL` - Documentation URL (default: https://docs.kodacode.ru/koda-cli/)
- `KODA_COMMUNITY_URL` - Telegram community (default: https://t.me/kodacommunity)
- `KODA_IDE_COMPANION_URL` - IDE companion installer (default: https://cli-companion.kodacode.ru/)

**GitHub OAuth URLs:**
- `GITHUB_DEVICE_CODE_URL` - Device code authorization (default: https://github.com/login/device/code)
- `GITHUB_OAUTH_TOKEN_URL` - OAuth token endpoint (default: https://github.com/login/oauth/access_token)

All hardcoded URLs have been replaced with `process.env.VARIABLE_NAME || 'default_value'` patterns, allowing full customization while maintaining backward compatibility with default values.

### Internationalization (I18N) Improvements

As part of the deobfuscation effort, significant improvements were made to make the codebase more readable and maintainable:

**1. Cyrillic Text Readability**
- Converted all Unicode escape sequences (e.g., `\u0410\u0441\u043D`) to readable Cyrillic characters
- The Russian translation object (`ADn`) previously contained 1,100+ lines of Unicode escapes
- All Russian strings are now displayed in native Cyrillic script
- Example: `'\u041E\u0441\u043D\u043E\u0432\u044B:'` → `'Основы:'`

**2. ASCII Art Banner I18N Integration**
- Moved hardcoded ASCII art banners to the I18N translation system
- Added `banner.large`, `banner.medium`, and `banner.small` entries to both English and Russian translations
- The banner component now uses `Ie.t('banner.large')` instead of hardcoded variables
- Enables potential future localization of banner art for different languages

**Benefits:**
- ✅ Improved code readability for Russian-speaking developers
- ✅ Easier to maintain and update translations
- ✅ Centralized ASCII art management through I18N system
- ✅ No functionality changes - all features work as before

The deobfuscation work is now complete with file splitting, full documentation, environment variable reference, configuration externalization, and I18N improvements.
