# K_DA Tools - Integrated Workflow Guide

**K_DA Tools** is an integrated command-line utility that combines all deobfuscation and build configuration experiments into a single, easy-to-use tool.

## Overview

This tool provides two main workflows as requested in [issue #28](https://github.com/judas-priest/hives/issues/28):

1. **Deobfuscation Workflow**: Extracts source code, localization files, and banners from `original.js`
2. **Configuration & Build Workflow**: Configures `.env`, changes localization strings, disables tracking, and builds the final executable

## Quick Start

### Complete Workflow (Recommended)

Run everything in one command:

```bash
cd k_da
node k_da-tools.js all
```

This will:
1. ✅ Deobfuscate `original.js` → `k_da_deobfuscated.js`
2. ✅ Split into source files (`src/01-*.js` through `src/05-*.js`)
3. ✅ Extract localization files (`src/i18n/locales/`)
4. ✅ Extract ASCII banners (`src/i18n/assets/`)
5. ✅ Convert Unicode strings and extract URLs
6. ✅ Configure `.env` with telemetry/tracking disabled
7. ✅ Build final `k_da.js`

### Custom Configuration

Run with custom branding and configuration:

```bash
node k_da-tools.js all \
  --app-name "My Custom CLI" \
  --company-name "MyCompany" \
  --disable-telemetry \
  --disable-tracking
```

## Two-Step Workflow

As requested in the issue, you can also run the workflow in two distinct phases:

### Step 1: Deobfuscation

Extract all source code, localization files, and banners:

```bash
node k_da-tools.js deobfuscate
node k_da-tools.js split
node k_da-tools.js extract-i18n
node k_da-tools.js extract-strings
```

**Output:**
- `k_da_deobfuscated.js` - Prettified source code
- `src/01-webpack-runtime.js` - Webpack runtime
- `src/02-react-bundle.js` - React library
- `src/03-npm-modules.js` - NPM dependencies
- `src/04-app-code.js` - Application code
- `src/05-main.js` - Entry point
- `src/i18n/locales/en-US.js` - English localization
- `src/i18n/locales/ru-RU.js` - Russian localization
- `src/i18n/assets/banner-*.txt` - ASCII banners
- `STRING_EXTRACTION_REPORT.md` - URLs and environment variables report

### Step 2: Configure and Build

Configure environment, change localization, disable tracking, and build:

```bash
# Configure .env and customize localization
node k_da-tools.js configure \
  --app-name "My CLI" \
  --company-name "MyCompany" \
  --disable-telemetry \
  --disable-tracking

# Make additional manual changes to localization if needed
nano src/i18n/locales/en-US.js

# Build the final executable
node k_da-tools.js build
```

**Output:**
- `.env` - Environment configuration with tracking disabled
- `k_da.js` - Final built executable

## Commands Reference

### `deobfuscate`

Deobfuscate the original minified file:

```bash
node k_da-tools.js deobfuscate [--input original.js]
```

**What it does:**
- Reads `original.js` (or specified input file)
- Applies Prettier formatting for readability
- Outputs `k_da_deobfuscated.js`

### `split`

Split deobfuscated file into manageable source files:

```bash
node k_da-tools.js split
```

**What it does:**
- Reads `k_da_deobfuscated.js`
- Splits into 5 source files based on webpack bundle structure
- Creates `src/` directory with all source files

**Output files:**
- `src/01-webpack-runtime.js` - Webpack module system (lines 5-39)
- `src/02-react-bundle.js` - React library bundle (lines 39-20,500)
- `src/03-npm-modules.js` - Bundled npm packages (lines 20,500-242,191)
- `src/04-app-code.js` - Application code (lines 242,191-278,185)
- `src/05-main.js` - Main entry function (lines 278,185-end)

### `extract-i18n`

Extract localization files and ASCII banners:

```bash
node k_da-tools.js extract-i18n
```

**What it does:**
- Extracts English locale (`var hDn = {`)
- Extracts Russian locale (`ADn = {`)
- Extracts ASCII art banners (large, medium, small)
- Creates modular localization structure

**Output files:**
- `src/i18n/locales/en-US.js` - English translations
- `src/i18n/locales/ru-RU.js` - Russian translations
- `src/i18n/assets/banner-large.txt` - Large ASCII banner
- `src/i18n/assets/banner-medium.txt` - Medium ASCII banner
- `src/i18n/assets/banner-small.txt` - Small ASCII banner

### `extract-strings`

Convert Unicode escapes and extract URLs:

```bash
node k_da-tools.js extract-strings
```

**What it does:**
- Converts all `\uXXXX` Unicode escape sequences to actual characters
- Extracts all HTTPS URLs
- Identifies environment variables
- Generates comprehensive report

**Output:**
- Updates `src/04-app-code.js` with converted strings
- Creates `STRING_EXTRACTION_REPORT.md` with findings

### `configure`

Configure environment and customize branding:

```bash
node k_da-tools.js configure [options]
```

**Options:**
- `--app-name <name>` - Custom application name (default: "K_DA CLI")
- `--company-name <name>` - Custom company name (default: "Koda")
- `--disable-telemetry` - Disable all telemetry (default: true)
- `--disable-tracking` - Disable all tracking (default: true)

**What it does:**
- Creates `.env` file with configuration
- Disables OpenTelemetry if requested
- Disables analytics and crash reporting if requested
- Customizes branding in localization files if requested

### `build`

Build the final executable:

```bash
node k_da-tools.js build
```

**What it does:**
- Runs the existing `build.js` script
- Concatenates all source files in order
- Inlines i18n locale data
- Creates executable `k_da.js`

### `all`

Run complete workflow:

```bash
node k_da-tools.js all [options]
```

Combines all commands in sequence. Accepts all options from `configure` command.

## Examples

### Example 1: Basic Usage

```bash
# Complete workflow with defaults
cd k_da
node k_da-tools.js all
node k_da.js --help
```

### Example 2: Custom Branding

```bash
# Complete workflow with custom branding
node k_da-tools.js all \
  --app-name "SuperCLI" \
  --company-name "SuperCorp"

# Test the customized app
node k_da.js --help
```

### Example 3: Manual Customization

```bash
# Step 1: Run deobfuscation
node k_da-tools.js deobfuscate
node k_da-tools.js split
node k_da-tools.js extract-i18n
node k_da-tools.js extract-strings

# Step 2: Manual customization
# Edit localization files
nano src/i18n/locales/en-US.js
nano src/i18n/locales/ru-RU.js

# Edit banners
nano src/i18n/assets/banner-large.txt

# Edit .env configuration
cp .env.example .env
nano .env
# Add: OTEL_SDK_DISABLED=true
# Add: KODA_TELEMETRY_ENABLED=false

# Step 3: Build
node k_da-tools.js build

# Test
node k_da.js --help
```

### Example 4: Privacy-Focused Build

```bash
# Complete workflow with all tracking disabled
node k_da-tools.js all \
  --disable-telemetry \
  --disable-tracking

# Verify tracking is disabled
grep -i "OTEL_SDK_DISABLED" .env
grep -i "TELEMETRY_ENABLED" .env
```

## Configuration Options

### Environment Variables

The tool automatically configures the following in `.env`:

**Telemetry (when `--disable-telemetry` is used):**
```bash
OTEL_SDK_DISABLED=true
KODA_TELEMETRY_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
```

**Tracking (when `--disable-tracking` is used):**
```bash
KODA_ANALYTICS_ENABLED=false
KODA_CRASH_REPORTING_ENABLED=false
```

### Localization Customization

After extraction, you can manually edit:

- `src/i18n/locales/en-US.js` - English strings
- `src/i18n/locales/ru-RU.js` - Russian strings
- `src/i18n/assets/banner-*.txt` - ASCII art banners

Then rebuild with:
```bash
node k_da-tools.js build
```

## Output Files

After running the complete workflow, you'll have:

```
k_da/
├── k_da-tools.js              # This integrated tool
├── original.js                # Original minified file (input)
├── k_da_deobfuscated.js      # Deobfuscated source
├── k_da.js                    # Final built executable ✓
├── .env                       # Environment configuration ✓
├── build.js                   # Build script
├── STRING_EXTRACTION_REPORT.md  # Extraction report ✓
└── src/
    ├── 01-webpack-runtime.js  # Webpack runtime ✓
    ├── 02-react-bundle.js     # React library ✓
    ├── 03-npm-modules.js      # NPM modules ✓
    ├── 04-app-code.js         # Application code ✓
    ├── 05-main.js             # Entry point ✓
    └── i18n/
        ├── locales/
        │   ├── en-US.js       # English locale ✓
        │   └── ru-RU.js       # Russian locale ✓
        └── assets/
            ├── banner-large.txt   # Large banner ✓
            ├── banner-medium.txt  # Medium banner ✓
            └── banner-small.txt   # Small banner ✓
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    K_DA Tools Workflow                          │
└─────────────────────────────────────────────────────────────────┘

    INPUT: original.js (minified)
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 1: Deobfuscate                                       │
   │ • Apply Prettier formatting                               │
   │ • Make code readable                                      │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: k_da_deobfuscated.js
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 2: Split File                                        │
   │ • Split into 5 manageable source files                    │
   │ • Organize by webpack bundle structure                    │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: src/01-*.js through src/05-*.js
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 3: Extract i18n                                      │
   │ • Extract English & Russian locales                       │
   │ • Extract ASCII banners                                   │
   │ • Create modular i18n structure                           │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: src/i18n/locales/*.js, src/i18n/assets/*.txt
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 4: Extract Strings                                   │
   │ • Convert Unicode escapes to characters                   │
   │ • Extract all URLs                                        │
   │ • Document environment variables                          │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: STRING_EXTRACTION_REPORT.md
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 5: Configure                                         │
   │ • Create .env file                                        │
   │ • Disable telemetry/tracking                              │
   │ • Customize branding                                      │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: .env, customized locales
       ↓
   ┌───────────────────────────────────────────────────────────┐
   │ STEP 6: Build                                             │
   │ • Concatenate all source files                            │
   │ • Inline i18n data                                        │
   │ • Create executable                                       │
   └───────────────────────────────────────────────────────────┘
       ↓
   OUTPUT: k_da.js (final executable)
```

## Comparison with Individual Experiment Scripts

Before K_DA Tools, you needed to run multiple scripts:

```bash
# Old way (manual, error-prone)
node experiments/deobfuscate.js
node experiments/split_file_v3.js
node experiments/extract_i18n.js
node experiments/extract-strings.js
node k_da/experiments/replace-branding.js --app-name "..." --company-name "..."
cp .env.test.no-telemetry .env
node k_da/build.js
```

Now with K_DA Tools:

```bash
# New way (integrated, simple)
node k_da-tools.js all --app-name "..." --company-name "..."
```

**Benefits:**
- ✅ Single command for complete workflow
- ✅ Automatic error handling and validation
- ✅ Progress reporting at each step
- ✅ Consistent file handling
- ✅ Integrated configuration
- ✅ Clear documentation

## Troubleshooting

### Error: "original.js not found"

**Solution:** Make sure you have `original.js` in the `k_da/` directory, or specify a different input:
```bash
node k_da-tools.js deobfuscate --input /path/to/your/file.js
```

### Error: "k_da_deobfuscated.js not found"

**Solution:** Run deobfuscate first:
```bash
node k_da-tools.js deobfuscate
```

### Error: "src/04-app-code.js not found"

**Solution:** Run split first:
```bash
node k_da-tools.js split
```

### Build fails

**Solution:** Make sure all source files exist:
```bash
ls -la src/
# Should show 01-*.js through 05-*.js and i18n/
```

### Customizations not applied

**Solution:** Make sure to configure before building:
```bash
node k_da-tools.js configure --app-name "..."
node k_da-tools.js build
```

## Advanced Usage

### Using as a Node.js Module

You can also use K_DA Tools programmatically:

```javascript
const kdaTools = require('./k_da-tools.js');

// Run complete workflow
await kdaTools.runAll({
  input: 'original.js',
  appName: 'My CLI',
  companyName: 'MyCompany',
  disableTelemetry: true,
  disableTracking: true,
});

// Or individual steps
await kdaTools.deobfuscate('original.js');
kdaTools.splitFile();
kdaTools.extractI18n();
kdaTools.extractStrings();
kdaTools.configure({ appName: 'My CLI' });
kdaTools.build();
```

## Integration with Existing Tools

K_DA Tools integrates and supersedes these individual experiment scripts:

- `experiments/deobfuscate.js` → `k_da-tools.js deobfuscate`
- `experiments/split_file_v3.js` → `k_da-tools.js split`
- `experiments/extract_i18n.js` → `k_da-tools.js extract-i18n`
- `experiments/extract-strings.js` → `k_da-tools.js extract-strings`
- `k_da/experiments/replace-branding.js` → `k_da-tools.js configure`
- `k_da/build.js` → `k_da-tools.js build`

The individual scripts remain available for reference and advanced use cases.

## License

This tool is part of the K_DA project. See the main project documentation for licensing information.

## Related Documentation

- `DEOBFUSCATION_REPORT.md` - Deobfuscation analysis
- `STRING_EXTRACTION_REPORT.md` - String extraction findings
- `BRANDING_CUSTOMIZATION_GUIDE.md` - Branding customization details
- `SPLIT_STRUCTURE.md` - File split structure
- `.env.example` - Environment variable reference
- `.env.test.no-telemetry` - Privacy-focused configuration example

## Support

For issues or questions:
- Open an issue at https://github.com/judas-priest/hives/issues
- Reference issue #28 for context

---

**Generated:** 2025-11-27
**Version:** 1.0.0
**Resolves:** [Issue #28](https://github.com/judas-priest/hives/issues/28)
