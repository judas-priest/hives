# K_DA - Koda Agent CLI

## Overview

K_DA is a deobfuscated and unminified version of the Koda Agent CLI application. Koda Agent is an interactive command-line interface tool built with Node.js and React that provides AI-powered coding assistance, authentication support, and IDE integration capabilities.

## File Structure

This repository contains the K_DA application split into multiple files for easier navigation and understanding:

```
k_da/
├── k_da.js                     # Main executable (built from src/)
├── k_da_deobfuscated.js        # Original deobfuscated file (backup)
├── build.js                    # Build script to create k_da.js from src/
├── src/                        # Split source files (for readability)
│   ├── 01-webpack-runtime.js   # Webpack module system (~1.5 KB)
│   ├── 02-react-bundle.js      # React library (~652 KB)
│   ├── 03-npm-modules.js       # NPM dependencies (~7.8 MB)
│   ├── 04-app-code.js          # Application logic (~1.2 MB)
│   ├── 05-main.js              # Entry point (~4.4 KB)
│   ├── i18n/                   # Internationalization files
│   │   ├── index.js            # i18n module exports
│   │   ├── locales/            # Translation files
│   │   │   ├── en-US.js        # English locale
│   │   │   └── ru-RU.js        # Russian locale
│   │   └── assets/             # Banner assets
│   │       ├── banner-large.txt
│   │       ├── banner-medium.txt
│   │       └── banner-small.txt
│   └── README.md               # Source structure documentation
├── .env.example                # Environment variables reference
├── README.md                   # This file
├── DEOBFUSCATION_REPORT.md     # Deobfuscation process details
└── SPLIT_STRUCTURE.md          # File split strategy documentation
```

## Quick Start

### 1. Customize Configuration (Optional)

Create a `.env` file to customize your build:

```bash
cd k_da
cp .env.example .env
nano .env  # Edit configuration
```

### 2. Customize Localization (Optional)

Edit localization files to change UI text:

```bash
nano k_da/src/i18n/locales/en-US.js  # English
nano k_da/src/i18n/locales/ru-RU.js  # Russian
```

### 3. Build the Executable

```bash
cd k_da
node build.js              # Default: uses .env for defaults
# or
node build.js --inline-env # Inline: hardcodes .env values
# or
node build.js --no-env     # No .env: uses only runtime variables
```

The build script:
1. ✅ Loads `.env` file (if exists) for configuration
2. ✅ Reads all source files from `src/` directory
3. ✅ Loads i18n locale data from `src/i18n/locales/`
4. ✅ Inlines the i18n objects into the bundle
5. ✅ Injects environment variable defaults from `.env`
6. ✅ Concatenates all files into a single executable `k_da.js`

**Build output:**
```
Building k_da.js from split sources...

Loading .env file...
   → Loaded 5 environment variables from .env
Loading i18n locale data...
[1/5] Adding src/01-webpack-runtime.js...
[2/5] Adding src/02-react-bundle.js...
[3/5] Adding src/03-npm-modules.js...
[4/5] Adding src/04-app-code.js...
   → Inlining i18n locale data...
   → Inlining environment variables from .env...
   → Set default values for 5 environment variable references
[5/5] Adding src/05-main.js...

✓ Built k_da.js (9.57 MB)
✓ i18n locale data inlined successfully
✓ Environment variables from .env set as defaults
```

### 4. Run the Application

```bash
./k_da.js [options]
# or
node k_da.js [options]
```

> **📚 For detailed build workflow, customization options, and troubleshooting, see [BUILD_WORKFLOW.md](BUILD_WORKFLOW.md)**

> **Note**: The source files in `src/` are split for readability only. They share a webpack bundle closure scope and cannot run independently. The build script automatically inlines the i18n data and environment variable defaults from the `src/i18n/` directory and `.env` file into the final bundle.

## Table of Contents

- [File Structure](#file-structure)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [IDE Integration](#ide-integration)
- [Sandbox Mode](#sandbox-mode)
- [Development](#development)
- [Deobfuscation Process](#deobfuscation-process)
- [File Split Strategy](#file-split-strategy)
- [Internationalization](#internationalization)
- [Troubleshooting](#troubleshooting)

## Features

### Core Capabilities

- **Interactive CLI Mode**: User-friendly command-line interface with prompts
- **AI-Powered Assistance**: Integration with various AI models (Koda, Gemini)
- **Authentication System**: Support for multiple authentication methods
  - GitHub OAuth login
  - API key authentication
  - External authentication providers
  - Vertex AI authentication
- **Configuration Management**: Persistent user preferences and settings
- **Theme Support**: Customizable CLI themes
- **Extension System**: Extensible architecture for adding new features
- **Sandbox Mode**: Isolated execution environment for testing
- **IDE Integration**: Experimental integration with IDEs (Zed, VSCode, JetBrains)
- **Web Search Integration**: Built-in web search capabilities
- **Telemetry**: Optional usage analytics and error reporting

### Technical Features

- **React-based UI**: Terminal UI components built with React
- **gRPC Communication**: High-performance RPC framework support
- **WebSocket Support**: Real-time bidirectional communication
- **OpenTelemetry**: Observability and monitoring integration
- **Google Cloud Integration**: Native support for GCP services
- **AWS Integration**: Support for AWS services and credentials

## Architecture

### Application Structure

The application is a webpack-bundled Node.js CLI tool with the following major components:

1. **Entry Point** (`k_da.js`): Main executable with shebang for CLI execution
2. **React Framework**: Bundled React 19.1.0 for terminal UI components
3. **Authentication Layer**: Multi-provider authentication system
4. **Configuration Manager**: User settings and preferences storage
5. **Sandbox Runtime**: Isolated execution environment
6. **IDE Clients**: Integration adapters for various IDEs
7. **AI Service Clients**: Connectors to AI APIs (Koda, Gemini)

### Technology Stack

- **Runtime**: Node.js (ESM modules)
- **UI Framework**: React 19.1.0
- **Bundler**: Webpack
- **Minification**: Terser (original form)
- **Communication**: gRPC, WebSocket
- **Cloud Providers**: Google Cloud Platform, AWS
- **Telemetry**: OpenTelemetry

## Installation

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

### Basic Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hives.git
cd hives/k_da

# Make the script executable
chmod +x k_da.js

# Run the CLI
./k_da.js
```

### Global Installation

```bash
# Link the CLI globally
npm link

# Run from anywhere
k_da
```

## Configuration

### Configuration File Locations

Koda Agent stores configuration in system-specific locations:

- **Linux/macOS**: `~/.config/koda/` or `$XDG_CONFIG_HOME/koda/`
- **Windows**: `%APPDATA%\koda\`

### Configuration Options

The CLI supports various configuration options:

- **Model Selection**: Choose between Koda Agent, Gemini, and other models
- **Authentication Type**: Configure preferred authentication method
- **Theme**: Select or create custom themes
- **Telemetry**: Enable/disable usage analytics
- **Debug Mode**: Enable verbose logging
- **Sandbox Settings**: Configure sandbox behavior
- **MCP Servers**: Configure Model Context Protocol servers

### Command-Line Flags

```bash
# Start with specific model
./k_da.js --model KodaAgent

# Enable debug mode
./k_da.js --debug

# Use specific authentication
./k_da.js --auth-type github

# Interactive prompt mode
./k_da.js --prompt-interactive

# List installed extensions
./k_da.js --list-extensions

# Disable sandbox
./k_da.js --no-sandbox
```

## Usage

### Basic Usage

```bash
# Start interactive session
./k_da.js

# Run with a specific question
./k_da.js "How do I implement a binary search in JavaScript?"

# Pipe input from another command
echo "Explain this code" | ./k_da.js
```

### Advanced Usage

```bash
# Enable authentication and use API key
export KODA_API_KEY="your_api_key"
./k_da.js --auth-type api-key

# Use with Google Cloud Vertex AI
export GOOGLE_CLOUD_PROJECT="your-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
./k_da.js --auth-type vertex

# Run in sandbox mode with custom image
export GEMINI_SANDBOX=true
export GEMINI_SANDBOX_IMAGE="custom-sandbox:latest"
./k_da.js --sandbox
```

## Environment Variables

Koda Agent uses numerous environment variables for configuration. A complete reference is available in [.env.example](.env.example).

### Essential Variables

```bash
# API Authentication
KODA_API_KEY=your_api_key_here
KODA_API_BASE=https://api.kodacode.ru

# Koda URLs (customizable)
KODA_SITE_URL=https://kodacode.ru
KODA_DOCS_URL=https://docs.kodacode.ru/koda-cli/
KODA_COMMUNITY_URL=https://t.me/kodacommunity
KODA_IDE_COMPANION_URL=https://cli-companion.kodacode.ru/

# GitHub Integration
KODA_GITHUB_TOKEN=ghp_your_token_here
LOGIN_WITH_GITHUB=true
GITHUB_DEVICE_CODE_URL=https://github.com/login/device/code
GITHUB_OAUTH_TOKEN_URL=https://github.com/login/oauth/access_token

# Google Cloud
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Debug Settings
DEBUG=*
DEBUG_AUTH=true

# Model Selection
GEMINI_MODEL=gemini-pro
```

### Variable Categories

The environment variables are organized into these categories:

1. **Core Application Settings**: NODE_ENV, CLI_TITLE, DEBUG
2. **Koda Configuration**: KODA_API_KEY, KODA_API_BASE
3. **Authentication**: GITHUB_TOKEN, OAUTH settings
4. **Google Cloud**: GCP project, credentials, Vertex AI
5. **AWS Configuration**: Access keys, regions
6. **gRPC Settings**: Verbosity, tracing, SSL
7. **Proxy Configuration**: HTTP_PROXY, HTTPS_PROXY
8. **Sandbox**: Sandbox image, environment, flags
9. **IDE Integration**: Port numbers, workspace paths
10. **Terminal Display**: Colors, term type
11. **OpenTelemetry**: Resource detectors

See [.env.example](.env.example) for complete documentation.

## Authentication

### Supported Authentication Methods

#### 1. Without Authentication
```bash
# Default mode - no authentication
./k_da.js
```

#### 2. GitHub OAuth
```bash
# Enable GitHub login
export LOGIN_WITH_GITHUB=true
./k_da.js --auth-type github
```

The CLI will open a browser for GitHub OAuth flow.

#### 3. API Key
```bash
# Use Koda API key
export KODA_API_KEY="your_api_key"
./k_da.js --auth-type api-key
```

#### 4. Google Cloud Vertex AI
```bash
# Authenticate with Google Cloud
export GOOGLE_CLOUD_PROJECT="your-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
./k_da.js --auth-type vertex
```

#### 5. External Authentication
```bash
# Use external auth provider
./k_da.js --auth-type external
```

### Authentication Debugging

Enable authentication debugging to troubleshoot issues:

```bash
export DEBUG_AUTH=true
./k_da.js --debug
```

## IDE Integration

Koda Agent supports integration with various IDEs:

### Supported IDEs

- **Visual Studio Code** (detected via `TERM_PROGRAM=vscode`)
- **JetBrains IDEs** (IntelliJ IDEA, PyCharm, WebStorm, etc.)
- **Zed Editor** (experimental integration)
- **Cursor Editor**

### IDE Server Configuration

```bash
# Set IDE server port
export KODA_CLI_IDE_SERVER_PORT=3000

# Set workspace path
export KODA_CLI_IDE_WORKSPACE_PATH=/path/to/workspace

# Enable Zed integration
./k_da.js --experimental-zed-integration
```

### Auto-Detection

The CLI automatically detects the following environments:

- GitHub Codespaces
- Google Cloud Shell
- Replit
- Firebase Deploy Environment
- JetBrains IDEs

## Sandbox Mode

Sandbox mode provides an isolated execution environment for running code safely.

### Enabling Sandbox

```bash
# Run in sandbox mode
export SANDBOX=true
./k_da.js

# Use custom sandbox image
export GEMINI_SANDBOX=true
export GEMINI_SANDBOX_IMAGE="my-sandbox:latest"
./k_da.js --sandbox
```

### Sandbox Configuration

```bash
# Configure sandbox environment variables (JSON)
export SANDBOX_ENV='{"NODE_ENV":"development"}'

# Set sandbox mount points
export SANDBOX_MOUNTS="/host/path:/container/path"

# Expose sandbox ports
export SANDBOX_PORTS="3000:3000,8080:8080"

# Set UID/GID in sandbox
export SANDBOX_SET_UID_GID=true
```

### macOS Seatbelt

On macOS, you can use Seatbelt profiles:

```bash
export SEATBELT_PROFILE=my-profile
./k_da.js --sandbox
```

## Development

### Project Structure

```
k_da/
├── k_da.js                      # Main deobfuscated executable
├── k_da_deobfuscated.js         # Backup deobfuscated version
├── k_da.js.minified.backup      # Original minified version
├── DEOBFUSCATION_REPORT.md      # Deobfuscation process documentation
├── .env.example                 # Environment variables reference
└── README.md                    # This file
```

### Key Code Sections

Due to webpack bundling, the code is structured as a single file with these major sections:

1. **Lines 1-5**: Shebang and ES module setup
2. **Lines 6-38**: Object manipulation utilities
3. **Lines 39-20500**: React framework bundle
4. **Lines 20500-80000**: Third-party dependencies (WebSocket, gRPC, etc.)
5. **Lines 80000-end**: Application logic (auth, config, CLI, IDE integration)

### Debugging

```bash
# Enable all debug output
export DEBUG=*
./k_da.js --debug

# Enable specific debug namespaces
export DEBUG=auth,config,grpc
./k_da.js

# Enable Node.js debugging
export DEBUG_PORT=9229
node --inspect ./k_da.js
```

### Memory Management

The application includes auto-configuration for Node.js memory limits:

```bash
# Manually set memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
./k_da.js

# Let the app auto-configure (if enabled)
./k_da.js --auto-configure-max-old-space-size
```

## Deobfuscation Process

### Original State

- **File Size**: 6.31 MB
- **Lines**: 2,039
- **State**: Heavily minified and obfuscated
- **Longest Line**: 29,633 characters

### Deobfuscated State

- **File Size**: 9.55 MB (+51%)
- **Lines**: 278,314 (+13,544%)
- **Tool Used**: Prettier with babel parser
- **Readability**: Significantly improved

### Process Details

See [DEOBFUSCATION_REPORT.md](./DEOBFUSCATION_REPORT.md) for complete details on:

- Obfuscation patterns identified
- Tools and techniques used
- Before/after comparisons
- Verification steps

### Limitations

While deobfuscation improved readability, some limitations remain:

- **Variable Names**: Short, mangled names (e.g., `ocr`, `Te`, `Oe`)
- **Function Names**: Obfuscated identifiers
- **Comments**: None present (stripped during minification)
- **Semantic Understanding**: Original names cannot be recovered without source maps

### Why Not Split Into Multiple Files?

The issue comment requested splitting into multiple files. However, this webpack bundle cannot be easily split because:

1. **Webpack Module System**: All modules are compiled into a single bundle
2. **Cross-References**: Heavy interdependencies throughout the code
3. **Closure Scope**: Many variables and functions rely on shared closure scope
4. **Minified Names**: Variable name collisions would occur if split
5. **Functionality Risk**: Splitting would likely break the application

Instead, this documentation provides:
- Complete environment variable reference (.env.example)
- Comprehensive documentation (this README)
- Deobfuscation report
- Usage guides and examples

## Internationalization

Koda Agent includes built-in internationalization (I18N) support for English and Russian languages.

### Supported Languages

- **English** (`en`) - Default language
- **Russian** (`ru`) - Full translation with native Cyrillic text

### Setting Language

You can configure the language using:

1. **Environment Variable:**
```bash
export KODA_RESPONSE_LANGUAGE=ru  # Russian
export KODA_RESPONSE_LANGUAGE=en  # English
./k_da.js
```

2. **CLI Command:**
```bash
./k_da.js language set ru  # Set to Russian
./k_da.js language set en  # Set to English
```

### I18N Improvements

As part of the deobfuscation process, significant I18N improvements were made:

**1. Readable Cyrillic Text**
- All Russian translations now use native Cyrillic characters instead of Unicode escape sequences
- Before: `'\u041E\u0441\u043D\u043E\u0432\u044B:'`
- After: `'Основы:'`
- Makes the source code readable for Russian-speaking developers

**2. Centralized ASCII Art**
- Application banner art moved to I18N translation system
- Supports three sizes: large, medium, and small (responsive to terminal width)
- Accessible via `Ie.t('banner.large')`, `Ie.t('banner.medium')`, `Ie.t('banner.small')`
- Enables potential future localization of banner art

**Translation Coverage:**
- All UI messages and prompts
- Help text and documentation strings
- Error messages and warnings
- Command descriptions
- Settings labels and descriptions
- ASCII art banners

### I18N Build Process

The i18n system is organized into separate modules for maintainability but gets inlined during the build:

**Source Structure:**
```
src/i18n/
├── index.js              # Module exports (not used in final bundle)
├── locales/
│   ├── en-US.js         # English translations (~38 KB)
│   └── ru-RU.js         # Russian translations (~87 KB)
└── assets/
    ├── banner-large.txt
    ├── banner-medium.txt
    └── banner-small.txt
```

**Build Process:**
1. The `build.js` script reads locale files from `src/i18n/locales/`
2. It strips the ES6 `export` statements and converts them to plain objects
3. The i18n data is inlined directly into the bundle at build time
4. This avoids runtime ES6 module imports that would fail in the bundled context

**Why Inlining?**
- The webpack bundle cannot dynamically import ES6 modules at runtime
- All code must be in a single file sharing the same closure scope
- Inlining ensures translations are available without external dependencies

To rebuild after modifying translations:
```bash
# Edit locale files in src/i18n/locales/
vi k_da/src/i18n/locales/ru-RU.js

# Rebuild the bundle
node k_da/build.js

# The updated translations are now in k_da.js
./k_da/k_da.js
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

```bash
# Enable auth debugging
export DEBUG_AUTH=true
./k_da.js --debug

# Force re-authentication
export KODA_FORCE_AUTH=true
./k_da.js
```

#### 2. gRPC Connection Issues

```bash
# Enable gRPC debugging
export GRPC_VERBOSITY=DEBUG
export GRPC_TRACE=all
./k_da.js
```

#### 3. Proxy Issues

```bash
# Configure proxy
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1

# For gRPC-specific proxy
export grpc_proxy=http://proxy.example.com:8080
```

#### 4. WebSocket Connection Failures

```bash
# Disable buffer utilities if causing issues
export WS_NO_BUFFER_UTIL=1
export WS_NO_UTF_8_VALIDATE=1
./k_da.js
```

#### 5. Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
./k_da.js

# Or use auto-configuration
./k_da.js --auto-configure-max-old-space-size
```

#### 6. Terminal Display Issues

```bash
# Force color output
export FORCE_COLOR=3
export COLORTERM=truecolor

# Or disable colors
export NO_COLOR=1
```

#### 7. Sandbox Issues

```bash
# Disable sandbox temporarily
./k_da.js --no-sandbox

# Use different sandbox image
export GEMINI_SANDBOX_IMAGE="alternative-sandbox:latest"
```

### Getting Help

1. **Enable Debug Mode**: Always start with `--debug` flag
2. **Check Environment**: Review all environment variables
3. **Review Logs**: Look for error messages and stack traces
4. **Test Authentication**: Verify credentials are valid
5. **Network Connectivity**: Check proxy and firewall settings
6. **IDE Integration**: Disable IDE mode to test CLI standalone

### Reporting Issues

When reporting issues, include:

- Node.js version: `node --version`
- Operating system and version
- Full command and flags used
- Relevant environment variables (redact secrets)
- Complete error message and stack trace
- Debug output: `DEBUG=* ./k_da.js --debug 2>&1 | tee debug.log`

## File Split Strategy

The original deobfuscated file (`k_da_deobfuscated.js`) is 278,000+ lines and 9.5 MB, making it difficult to navigate in most editors. To improve readability and maintainability, the file has been split into logical sections:

### Source Files

1. **01-webpack-runtime.js** (~1.5 KB, 33 lines)
   - Webpack module system and runtime utilities
   - Object manipulation helpers
   - Module loader function (T)
   - ES module compatibility layer

2. **02-react-bundle.js** (~652 KB, 20,462 lines)
   - Complete React 19.1.0 library bundle
   - React JSX runtime
   - React hooks and components
   - React development and production modes

3. **03-npm-modules.js** (~7.8 MB, 221,691 lines)
   - All bundled npm packages and dependencies
   - Emoji regex utilities
   - WebSocket libraries
   - gRPC modules
   - Various utility libraries

4. **04-app-code.js** (~1.2 MB, 35,994 lines)
   - Node.js imports (stream, process, etc.)
   - Application helper functions
   - Configuration management
   - Authentication handlers
   - CLI argument parsing utilities
   - IDE integration code
   - Sandbox configuration

5. **05-main.js** (~4.4 KB, 130 lines)
   - Main async function `$ur()`
   - Application bootstrap and initialization
   - Interactive mode setup
   - Error handling

### Build Process

The split files cannot run independently because they share the webpack bundle's closure scope. To create a working executable:

```bash
cd k_da
node build.js
```

This concatenates all source files in order, maintaining the shared scope while producing a functionally identical executable.

### Benefits of Split Structure

- **Easier Navigation**: Quickly jump to React code, npm modules, or app logic
- **Better Understanding**: Clear separation between framework, dependencies, and application code
- **Improved Editing**: Smaller files load faster in editors
- **Code Organization**: Logical boundaries make the codebase more approachable
- **Line References**: Each file header shows original line numbers for cross-referencing

### Technical Details

- **Original File**: Lines in k_da_deobfuscated.js are preserved in file headers
- **Shared Scope**: All variables and functions share the webpack bundle closure
- **Build Script**: Automatically handles concatenation and cleanup
- **Executable**: The built k_da.js is functionally identical to k_da_deobfuscated.js

For more details, see [SPLIT_STRUCTURE.md](./SPLIT_STRUCTURE.md) and [src/README.md](./src/README.md).

## License

[License information to be added]

## Credits

- Original Application: Koda Agent
- Deobfuscation: Performed using Prettier
- This Documentation: Created for the deobfuscated version

## Additional Resources

- [Deobfuscation Report](./DEOBFUSCATION_REPORT.md) - Detailed deobfuscation process
- [Environment Variables](./.env.example) - Complete environment variable reference
- React Documentation - https://react.dev/
- gRPC Documentation - https://grpc.io/
- Google Cloud Documentation - https://cloud.google.com/docs
