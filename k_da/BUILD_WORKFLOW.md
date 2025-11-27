# K_DA Build Workflow Guide

## Overview

This guide explains the complete workflow for building and customizing k_da, from deobfuscation to final executable with your custom configuration and branding.

## Workflow Steps

### 1. Deobfuscation (Already Done)

The original `original.js` has been deobfuscated and split into manageable source files:

```
k_da/
├── k_da_deobfuscated.js          # Full deobfuscated source
├── src/
│   ├── 01-webpack-runtime.js     # Webpack runtime
│   ├── 02-react-bundle.js        # React and UI components
│   ├── 03-npm-modules.js         # NPM dependencies
│   ├── 04-app-code.js            # Main application code
│   ├── 05-main.js                # Entry point
│   └── i18n/
│       ├── locales/
│       │   ├── en-US.js          # English localization
│       │   └── ru-RU.js          # Russian localization
│       └── assets/
│           ├── banner-large.txt  # ASCII banner (large)
│           ├── banner-medium.txt # ASCII banner (medium)
│           └── banner-small.txt  # ASCII banner (small)
```

### 2. Customize Configuration (.env)

Create or edit `k_da/.env` file to customize your build:

```bash
cd k_da
cp .env.example .env
nano .env  # or your favorite editor
```

**Example customizations:**

```env
# Custom branding URLs
KODA_SITE_URL=https://mysite.com
KODA_API_BASE=https://api.mysite.com
KODA_DOCS_URL=https://docs.mysite.com
KODA_COMMUNITY_URL=https://t.me/mycommunity

# Disable tracking/telemetry
OTEL_SDK_DISABLED=true
DETECT_GCP_RETRIES=0
METADATA_SERVER_DETECTION=false

# Custom API keys
GOOGLE_API_KEY=your_api_key_here
POLZA_API_KEY=your_polza_key_here
```

**Key environment variables:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `KODA_SITE_URL` | Main website URL | `https://mysite.com` |
| `KODA_API_BASE` | API endpoint | `https://api.mysite.com` |
| `KODA_DOCS_URL` | Documentation URL | `https://docs.mysite.com` |
| `GOOGLE_API_KEY` | Google AI API key | `AIza...` |
| `OTEL_SDK_DISABLED` | Disable telemetry | `true` |

See `.env.example` for complete list of 50+ configurable variables.

### 3. Customize Localization

Edit localization files to change UI text:

```bash
# Edit English localization
nano k_da/src/i18n/locales/en-US.js

# Edit Russian localization
nano k_da/src/i18n/locales/ru-RU.js

# Edit ASCII banners
nano k_da/src/i18n/assets/banner-large.txt
```

**Localization structure:**

```javascript
export const enUS = {
  banner: {
    large: `/* ASCII art */`,
    medium: `/* ASCII art */`,
    small: `/* ASCII art */`,
  },
  help: {
    basics: 'Basics:',
    addContext: 'Add context',
    // ... more strings
  },
  // ... more categories
};
```

**Common customizations:**
- Change banner ASCII art
- Modify help text
- Customize error messages
- Update command descriptions

### 4. Build the Executable

Run the build script to create your customized `k_da.js`:

```bash
cd k_da
node build.js
```

**Build modes:**

| Command | Mode | Description |
|---------|------|-------------|
| `node build.js` | Default | Uses .env for defaults, runtime can override |
| `node build.js --inline-env` | Inline | Hardcodes .env values, no runtime override |
| `node build.js --no-env` | No .env | Ignores .env, uses only runtime variables |

**What the build script does:**

1. ✅ Loads `.env` file (if exists)
2. ✅ Reads i18n localization files
3. ✅ Concatenates all source files in order
4. ✅ Inlines i18n locale data into the bundle
5. ✅ Injects environment variable defaults
6. ✅ Creates executable `k_da.js`

**Build output example:**

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

✓ Built /path/to/k_da.js (9.57 MB)
✓ i18n locale data inlined successfully
✓ Environment variables from .env set as defaults

To run: ./k_da/k_da.js or node k_da/k_da.js
```

### 5. Test Your Build

Run the built executable to verify customizations:

```bash
# Run k_da
./k_da.js --help

# Or with node
node k_da.js --help

# Test with environment override (only works in default mode)
KODA_SITE_URL=https://override.com node k_da.js
```

### 6. Distribute Your Build

Your customized `k_da.js` is now ready for distribution:

```bash
# Make it executable
chmod +x k_da.js

# Copy to bin directory
sudo cp k_da.js /usr/local/bin/k_da

# Or distribute as-is
tar -czf k_da-custom.tar.gz k_da.js .env
```

## Build Modes Explained

### Default Mode (Recommended)

```bash
node build.js
```

- **How it works:** Replaces `process.env.VAR` with `(process.env.VAR || "default_value")`
- **Pros:** Runtime flexibility, can override with environment variables
- **Cons:** Slightly larger file size
- **Use case:** When you want defaults but allow runtime customization

**Example result:**
```javascript
// Original code
const apiUrl = process.env.KODA_API_BASE;

// After build
const apiUrl = (process.env.KODA_API_BASE || "https://api.mysite.com");

// Runtime: KODA_API_BASE=https://other.com node k_da.js
// Uses: "https://other.com"

// Runtime: node k_da.js
// Uses: "https://api.mysite.com"
```

### Inline Mode (Fully Customized)

```bash
node build.js --inline-env
```

- **How it works:** Replaces `process.env.VAR` with actual string literals
- **Pros:** Smaller file, no runtime dependencies, truly hardcoded
- **Cons:** Cannot override at runtime
- **Use case:** When you want a fully standalone, non-configurable binary

**Example result:**
```javascript
// Original code
const apiUrl = process.env.KODA_API_BASE;

// After build
const apiUrl = "https://api.mysite.com";

// Runtime: KODA_API_BASE=https://other.com node k_da.js
// Still uses: "https://api.mysite.com" (cannot be overridden)
```

### No-Env Mode (Original Behavior)

```bash
node build.js --no-env
```

- **How it works:** Ignores `.env` file completely
- **Pros:** Clean build, no modifications
- **Cons:** Requires all config at runtime
- **Use case:** Development or when using external config management

**Example result:**
```javascript
// Original code
const apiUrl = process.env.KODA_API_BASE;

// After build (unchanged)
const apiUrl = process.env.KODA_API_BASE;

// Runtime: KODA_API_BASE=https://mysite.com node k_da.js
// Uses: "https://mysite.com"

// Runtime: node k_da.js
// Uses: undefined (may cause errors)
```

## Common Customization Scenarios

### Scenario 1: Complete Rebranding

```bash
# 1. Configure branding
cat > k_da/.env << EOF
KODA_SITE_URL=https://mycompany.com
KODA_API_BASE=https://api.mycompany.com
KODA_DOCS_URL=https://docs.mycompany.com
KODA_COMMUNITY_URL=https://t.me/mycompany
EOF

# 2. Update banner
nano k_da/src/i18n/assets/banner-large.txt

# 3. Update localization
sed -i 's/Koda/MyApp/g' k_da/src/i18n/locales/en-US.js

# 4. Build
cd k_da && node build.js --inline-env
```

### Scenario 2: Privacy-Focused Build

```bash
# 1. Use no-telemetry template
cp k_da/.env.test.no-telemetry k_da/.env

# 2. Build with defaults
cd k_da && node build.js

# Result: Telemetry disabled by default, but can be enabled at runtime if needed
```

### Scenario 3: Development Build

```bash
# 1. Set development config
cat > k_da/.env << EOF
NODE_ENV=development
DEBUG=*
OTEL_SDK_DISABLED=true
EOF

# 2. Build with defaults (allows runtime override)
cd k_da && node build.js

# 3. Run with debug
DEBUG=k_da:* node k_da/k_da.js
```

## Troubleshooting

### Issue: Environment variables not applied

**Symptom:** Changes to `.env` don't appear in built file

**Solution:**
```bash
# 1. Verify .env format (no spaces around =)
cat k_da/.env

# 2. Rebuild
rm k_da/k_da.js
cd k_da && node build.js

# 3. Verify injection
grep "KODA_SITE_URL" k_da/k_da.js
```

### Issue: Localization changes not applied

**Symptom:** UI still shows old text

**Solution:**
```bash
# 1. Check locale file syntax
node -c k_da/src/i18n/locales/en-US.js

# 2. Rebuild
cd k_da && node build.js

# 3. Verify inlining
grep "basics:" k_da/k_da.js
```

### Issue: Build fails

**Symptom:** Build script throws errors

**Solution:**
```bash
# 1. Check source files exist
ls -la k_da/src/*.js

# 2. Check i18n files exist
ls -la k_da/src/i18n/locales/*.js

# 3. Run with verbose output
cd k_da && node build.js 2>&1 | tee build.log
```

### Issue: Runtime errors after build

**Symptom:** Built k_da.js crashes when running

**Solution:**
```bash
# 1. Check syntax
node -c k_da/k_da.js

# 2. Run with error output
node k_da/k_da.js 2>&1 | tee runtime.log

# 3. Rebuild without .env to isolate issue
cd k_da && node build.js --no-env
```

## Advanced Topics

### Automating Builds with CI/CD

```yaml
# .github/workflows/build.yml
name: Build k_da
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Configure .env
        run: |
          echo "KODA_SITE_URL=${{ secrets.SITE_URL }}" > k_da/.env
          echo "KODA_API_BASE=${{ secrets.API_BASE }}" >> k_da/.env
      - name: Build
        run: cd k_da && node build.js --inline-env
      - name: Upload artifact
        uses: actions/upload-artifact@v2
        with:
          name: k_da-custom
          path: k_da/k_da.js
```

### Multiple Build Configurations

```bash
# Build for different environments
for env in dev staging prod; do
  cp k_da/.env.$env k_da/.env
  cd k_da && node build.js --inline-env
  mv k_da.js k_da-$env.js
done
```

### Verifying Build Integrity

```bash
# Check file size
ls -lh k_da/k_da.js

# Check syntax
node -c k_da/k_da.js

# Check injected values
grep -o "KODA_SITE_URL[^,]*" k_da/k_da.js | head -5

# Test execution
timeout 5s node k_da/k_da.js --help || echo "Check if help works"
```

## Quick Reference

```bash
# Standard workflow
cd k_da
cp .env.example .env        # 1. Copy config template
nano .env                    # 2. Edit configuration
nano src/i18n/locales/*.js  # 3. Edit localization
node build.js                # 4. Build executable
./k_da.js --help            # 5. Test

# Quick rebuild after changes
cd k_da && node build.js && ./k_da.js --help

# Clean build
rm k_da/k_da.js && cd k_da && node build.js --no-env
```

## Summary

The new build system provides:

✅ **Environment variable injection** - Configure via `.env` file
✅ **Localization support** - Customize all UI text
✅ **Multiple build modes** - Default, inline, or no-env
✅ **Runtime flexibility** - Override defaults when needed (default mode)
✅ **Privacy features** - Disable tracking and telemetry
✅ **Easy customization** - No code changes required

The build process is now fully integrated and respects your configuration and localization changes!
