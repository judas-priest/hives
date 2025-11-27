#!/usr/bin/env bun

/**
 * K_DA Tools - Integrated deobfuscation and build configuration tool
 *
 * This tool provides two main workflows:
 * 1. Deobfuscation: Extracts source code, localization files, and banners from k_da.js
 * 2. Configuration & Build: Configures .env, customizes localization, disables tracking, and builds
 *
 * Usage:
 *   bun k_da-tools.js deobfuscate [--input original.js]
 *   bun k_da-tools.js configure [options]
 *   bun k_da-tools.js build
 *   bun k_da-tools.js all [options]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// =============================================================================
// UTILITIES
// =============================================================================

function log(message, prefix = "•") {
  console.log(`${prefix} ${message}`);
}

function success(message) {
  console.log(`✓ ${message}`);
}

function error(message) {
  console.error(`✗ ${message}`);
}

function section(title) {
  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80) + "\n");
}

function fileSize(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

// =============================================================================
// STEP 1: DEOBFUSCATION
// =============================================================================

async function deobfuscate(inputFile = "original.js") {
  section("STEP 1: DEOBFUSCATION");

  const inputPath = path.join(__dirname, inputFile);
  const outputPath = path.join(__dirname, "k_da_deobfuscated.js");

  // Remove old deobfuscated file to avoid caching
  if (fs.existsSync(outputPath)) {
    log("Removing old deobfuscated file to avoid cache conflicts...");
    fs.unlinkSync(outputPath);
  }

  // Remove old src directory to avoid caching
  const srcDir = path.join(__dirname, "src");
  if (fs.existsSync(srcDir)) {
    log("Removing old src directory to avoid cache conflicts...");
    fs.rmSync(srcDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(inputPath)) {
    error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  log(`Reading: ${inputFile}`);
  const content = fs.readFileSync(inputPath, "utf8");
  const inputSize = content.length;

  log(`Size: ${fileSize(inputSize)}`);
  log(`Lines: ${content.split("\n").length.toLocaleString()}`);

  // Apply prettier formatting (optional - skip if prettier not installed)
  let formatted = content;
  try {
    log("Attempting prettier formatting...");
    const prettier = require("prettier");
    formatted = await prettier.format(content, {
      parser: "babel",
      printWidth: 100,
      tabWidth: 2,
      semi: true,
      singleQuote: true,
      trailingComma: "es5",
      arrowParens: "always",
    });
    success("Prettier formatting applied");
  } catch (err) {
    log("Prettier not available - skipping formatting (file will still work)");
    formatted = content;
  }

  fs.writeFileSync(outputPath, formatted, "utf8");
  success(`Deobfuscated file written: ${outputPath}`);
  success(`Output size: ${fileSize(formatted.length)}`);

  return outputPath;
}

// =============================================================================
// STEP 2: SPLIT FILE
// =============================================================================

function splitFile() {
  section("STEP 2: SPLIT INTO SOURCE FILES");

  const filePath = path.join(__dirname, "k_da_deobfuscated.js");

  if (!fs.existsSync(filePath)) {
    error("k_da_deobfuscated.js not found. Run deobfuscate first.");
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  log(`Total lines: ${lines.length.toLocaleString()}`);

  // Create directory structure
  const srcDir = path.join(__dirname, "src");
  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
  }
  fs.mkdirSync(srcDir, { recursive: true });

  // Auto-detect if file is minified or formatted
  const isMinified = lines.length < 10000;

  let splits;
  if (isMinified) {
    log("Detected minified file - using simplified split");
    // For minified files, put all content in 04-app-code.js for extract-i18n to find
    splits = [
      {
        filename: "src/01-webpack-runtime.js",
        start: 5,
        end: 6,
        description: "Webpack module system and runtime utilities",
      },
      {
        filename: "src/02-react-bundle.js",
        start: 6,
        end: 7,
        description: "React library bundle (v19.1.0)",
      },
      {
        filename: "src/03-npm-modules.js",
        start: 7,
        end: 8,
        description: "Bundled npm packages and dependencies",
      },
      {
        filename: "src/04-app-code.js",
        start: 8,
        end: lines.length - 1,
        description: "Application code, helpers, and configuration",
      },
      {
        filename: "src/05-main.js",
        start: lines.length - 1,
        end: lines.length,
        description: "Main entry function and bootstrap",
      },
    ];
  } else {
    log("Detected formatted file - using detailed split");
    // For formatted files, use detailed boundaries
    splits = [
      {
        filename: "src/01-webpack-runtime.js",
        start: 5,
        end: 39,
        description: "Webpack module system and runtime utilities",
      },
      {
        filename: "src/02-react-bundle.js",
        start: 39,
        end: 20500,
        description: "React library bundle (v19.1.0)",
      },
      {
        filename: "src/03-npm-modules.js",
        start: 20500,
        end: 242191,
        description: "Bundled npm packages and dependencies",
      },
      {
        filename: "src/04-app-code.js",
        start: 242191,
        end: 278185,
        description: "Application code, helpers, and configuration",
      },
      {
        filename: "src/05-main.js",
        start: 278185,
        end: lines.length,
        description: "Main entry function and bootstrap",
      },
    ];
  }

  // First, create the shebang file (lines 1-2 from k_da_deobfuscated.js)
  log(`[0/${splits.length + 1}] Creating src/00-shebang.js...`);
  const shebangLines = lines.slice(0, 2);
  const shebangContent = shebangLines.join("\n");
  const shebangPath = path.join(__dirname, "src/00-shebang.js");

  let shebangFileContent = `/**\n * Shebang and module setup\n`;
  shebangFileContent += ` * Lines 1-2 from original k_da_deobfuscated.js\n`;
  shebangFileContent += ` * This file contains the Node.js shebang and ES module compatibility setup\n */\n\n`;
  shebangFileContent += shebangContent;

  fs.writeFileSync(shebangPath, shebangFileContent);
  const shebangSizeMB = (shebangFileContent.length / 1024 / 1024).toFixed(2);
  success(`00-shebang.js - ${shebangLines.length.toLocaleString()} lines, ${shebangSizeMB} MB`);

  // Extract each section
  splits.forEach((split, index) => {
    log(`[${index + 1}/${splits.length + 1}] Creating ${split.filename}...`);

    const sectionLines = lines.slice(split.start, split.end);
    const sectionContent = sectionLines.join("\n");

    const outputPath = path.join(__dirname, split.filename);

    // Create file header comment
    let fileContent = `/**\n * ${split.description}\n`;
    fileContent += ` * Lines ${split.start + 1}-${split.end} from original k_da_deobfuscated.js\n`;
    fileContent += ` * This file is part of the k_da application split from webpack bundle\n */\n\n`;
    fileContent += sectionContent;

    fs.writeFileSync(outputPath, fileContent);

    const sizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
    success(
      `${split.filename.split("/")[1]} - ${sectionLines.length.toLocaleString()} lines, ${sizeMB} MB`,
    );
  });

  success("Source files split successfully");
}

// =============================================================================
// STEP 3: EXTRACT I18N
// =============================================================================

// Helper function to extract a balanced object from minified code
function extractBalancedObject(content, startPattern) {
  const match = content.match(startPattern);
  if (!match) return null;

  const startPos = match.index + match[0].length - 1; // Position of opening {
  let braceCount = 0;
  let pos = startPos;

  // Find matching closing brace
  while (pos < content.length) {
    if (content[pos] === '{') braceCount++;
    else if (content[pos] === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Found the end, extract the object including the braces
        const objectStr = content.substring(startPos, pos + 1);
        const fullMatch = content.substring(match.index, pos + 2); // Include semicolon if present
        return { objectStr, fullMatch, varName: match[1] };
      }
    }
    pos++;
  }

  return null;
}

function extractI18n() {
  section("STEP 3: EXTRACT LOCALIZATION FILES");

  const appCodeFile = path.join(__dirname, "src/04-app-code.js");

  if (!fs.existsSync(appCodeFile)) {
    error("src/04-app-code.js not found. Run split first.");
    process.exit(1);
  }

  const content = fs.readFileSync(appCodeFile, "utf8");

  // Create directories
  const i18nDir = path.join(__dirname, "src/i18n");
  const localesDir = path.join(i18nDir, "locales");
  const assetsDir = path.join(i18nDir, "assets");

  [i18nDir, localesDir, assetsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Find i18n objects in the code
  log("Searching for i18n objects...");

  // Find English i18n (var hDn = {...)
  const enMatch = extractBalancedObject(content, /var\s+(hDn)\s*=\s*(\{)/);
  if (!enMatch) {
    error("Could not find English i18n object (var hDn = {...})");
    process.exit(1);
  }

  const enContent = `export const enUS = ${enMatch.objectStr};`;
  fs.writeFileSync(path.join(localesDir, "en-US.js"), enContent);
  success("English locale extracted: src/i18n/locales/en-US.js");

  // Find Russian i18n (usually ADn or similar variable name = {...})
  // Look for pattern after the English locale
  const afterEnPos = content.indexOf(enMatch.fullMatch) + enMatch.fullMatch.length;
  const restContent = content.substring(afterEnPos);

  // Match pattern like: ADn={...} or ADn = {...}
  const ruMatch = extractBalancedObject(restContent, /([A-Z][a-zA-Z0-9]{2})\s*=\s*(\{)/);
  if (!ruMatch) {
    log("⚠ Warning: Could not find Russian i18n object");
  } else {
    const ruContent = `export const ruRU = ${ruMatch.objectStr};`;
    fs.writeFileSync(path.join(localesDir, "ru-RU.js"), ruContent);
    success("Russian locale extracted: src/i18n/locales/ru-RU.js");
  }

  // Extract banners from English locale
  log("Extracting ASCII banners...");
  const enFile = fs.readFileSync(path.join(localesDir, "en-US.js"), "utf8");

  let bannersFound = 0;

  // Extract large banner
  const largeBannerMatch = enFile.match(/large:\s*`([^`]+)`/s);
  if (largeBannerMatch) {
    fs.writeFileSync(
      path.join(assetsDir, "banner-large.txt"),
      largeBannerMatch[1].trim(),
    );
    success("Large banner extracted: src/i18n/assets/banner-large.txt");
    bannersFound++;
  }

  // Extract medium banner
  const mediumBannerMatch = enFile.match(/medium:\s*`([^`]+)`/s);
  if (mediumBannerMatch) {
    fs.writeFileSync(
      path.join(assetsDir, "banner-medium.txt"),
      mediumBannerMatch[1].trim(),
    );
    success("Medium banner extracted: src/i18n/assets/banner-medium.txt");
    bannersFound++;
  }

  // Extract small banner
  const smallBannerMatch = enFile.match(/small:\s*`([^`]+)`/s);
  if (smallBannerMatch) {
    fs.writeFileSync(
      path.join(assetsDir, "banner-small.txt"),
      smallBannerMatch[1].trim(),
    );
    success("Small banner extracted: src/i18n/assets/banner-small.txt");
    bannersFound++;
  }

  if (bannersFound === 0) {
    log("⚠ No ASCII banners found in locale data (this is normal for some versions)");
  }

  // Конвертируем Unicode в нормальную кириллицу
  log("Converting Unicode to Cyrillic...");
  const locales = ["en-US.js", "ru-RU.js"];
  locales.forEach((locale) => {
    const filePath = path.join(localesDir, locale);
    let content = fs.readFileSync(filePath, "utf8");
    content = content.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
    fs.writeFileSync(filePath, content, "utf8");
    success(`Unicode fixed: ${locale}`);
  });

  success("Localization files extracted successfully");
}

// =============================================================================
// STEP 4: EXTRACT STRINGS (Unicode, URLs, etc.)
// =============================================================================

function extractStrings() {
  section("STEP 4: EXTRACT STRINGS AND URLS");

  const appCodeFile = path.join(__dirname, "src/04-app-code.js");

  if (!fs.existsSync(appCodeFile)) {
    error("src/04-app-code.js not found. Run split first.");
    process.exit(1);
  }

  let content = fs.readFileSync(appCodeFile, "utf8");
  const originalSize = content.length;

  // Convert Unicode escape sequences
  log("Converting Unicode escape sequences...");
  const unicodePattern = /\\u([0-9a-fA-F]{4})/g;
  let unicodeCount = 0;
  content = content.replace(unicodePattern, (match, code) => {
    unicodeCount++;
    return String.fromCharCode(parseInt(code, 16));
  });

  if (unicodeCount > 0) {
    fs.writeFileSync(appCodeFile, content, "utf8");
    success(
      `Converted ${unicodeCount.toLocaleString()} Unicode escape sequences`,
    );
  } else {
    log("No Unicode escape sequences found");
  }

  // Extract URLs
  log("Extracting URLs...");
  const httpsUrls = [];
  const httpsPattern = /(https:\/\/[^\s'"`,)]+)/g;
  let match;
  while ((match = httpsPattern.exec(content)) !== null) {
    const url = match[1].replace(/[.,;)]$/, "");
    if (!httpsUrls.includes(url)) {
      httpsUrls.push(url);
    }
  }

  log(`Found ${httpsUrls.length} unique HTTPS URLs`);
  httpsUrls.slice(0, 5).forEach((url) => log(`  - ${url}`, "  "));
  if (httpsUrls.length > 5) {
    log(`  ... and ${httpsUrls.length - 5} more`, "  ");
  }

  // Extract environment variables
  log("Extracting environment variables...");
  const envVars = new Set();
  const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  while ((match = envPattern.exec(content)) !== null) {
    envVars.add(match[1]);
  }

  log(`Found ${envVars.size} unique environment variables`);

  // Generate report
  const reportPath = path.join(__dirname, "STRING_EXTRACTION_REPORT.md");
  const report = `# K_DA String Extraction Report

Generated: ${new Date().toISOString()}

## Summary

- **Unicode Escape Sequences Converted**: ${unicodeCount.toLocaleString()}
- **HTTPS URLs Found**: ${httpsUrls.length}
- **Environment Variables Used**: ${envVars.size}

## URLs

${httpsUrls.map((url, i) => `${i + 1}. \`${url}\``).join("\n")}

## Environment Variables

${Array.from(envVars)
  .sort()
  .map((envVar, i) => `${i + 1}. \`${envVar}\``)
  .join("\n")}

## Recommendations

1. All service URLs should be configurable via environment variables
2. Test the build with different configurations
3. Review environment variable usage for security

---

*This report was generated automatically by k_da-tools.js*
`;

  fs.writeFileSync(reportPath, report);
  success(`Report written: ${reportPath}`);

  success("String extraction complete");
}

// =============================================================================
// STEP 5: CONFIGURE
// =============================================================================

function configure(options = {}) {
  section("STEP 5: CONFIGURE ENVIRONMENT");

  const {
    appName = "K_DA CLI",
    companyName = "Koda",
    disableTelemetry = true,
    disableTracking = true,
  } = options;

  log(`Application Name: ${appName}`);
  log(`Company Name: ${companyName}`);
  log(`Disable Telemetry: ${disableTelemetry ? "Yes" : "No"}`);
  log(`Disable Tracking: ${disableTracking ? "Yes" : "No"}`);

  // Create .env file
  const envPath = path.join(__dirname, ".env");
  const envExamplePath = path.join(__dirname, ".env.example");

  let envContent = "";

  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, "utf8");
  }

  // Add custom configuration
  envContent += `\n# Custom Configuration (generated by k_da-tools.js)\n`;
  envContent += `# Generated: ${new Date().toISOString()}\n\n`;

  if (disableTelemetry) {
    envContent += `# Telemetry Disabled\n`;
    envContent += `OTEL_SDK_DISABLED=true\n`;
    envContent += `KODA_TELEMETRY_ENABLED=false\n`;
    envContent += `OTEL_EXPORTER_OTLP_ENDPOINT=\n`;
    envContent += `OTEL_EXPORTER_OTLP_HEADERS=\n\n`;
  }

  if (disableTracking) {
    envContent += `# Tracking Disabled\n`;
    envContent += `KODA_ANALYTICS_ENABLED=false\n`;
    envContent += `KODA_CRASH_REPORTING_ENABLED=false\n\n`;
  }

  fs.writeFileSync(envPath, envContent);
  success(`.env file created: ${envPath}`);

  // Customize branding if requested
  if (appName !== "K_DA CLI" || companyName !== "Koda") {
    log("Customizing branding...");

    const localesDir = path.join(__dirname, "src/i18n/locales");
    const enUSPath = path.join(localesDir, "en-US.js");

    if (fs.existsSync(enUSPath)) {
      let content = fs.readFileSync(enUSPath, "utf8");

      // Replace Koda CLI with custom app name
      content = content.replace(/Koda CLI/g, appName);
      content = content.replace(/Koda Code/g, `${companyName} Code`);
      content = content.replace(/\bKoda\b/g, companyName);

      fs.writeFileSync(enUSPath, content);
      success(`Branding customized in ${enUSPath}`);
    }
  }

  success("Configuration complete");
}

// =============================================================================
// STEP 6: BUILD
// =============================================================================

function build() {
  section("STEP 6: BUILD k_da.js");

  const buildScript = path.join(__dirname, "build.js");

  if (!fs.existsSync(buildScript)) {
    error("build.js not found");
    process.exit(1);
  }

  log("Running build script...");

  try {
    execSync(`bun ${buildScript}`, {
      cwd: __dirname,
      stdio: "inherit",
    });

    success("Build completed successfully");

    // Check output
    const outputPath = path.join(__dirname, "k_da.js");
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      success(`Output file: ${outputPath} (${fileSize(stats.size)})`);
    }
  } catch (err) {
    error(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

// =============================================================================
// MAIN WORKFLOW
// =============================================================================

async function runAll(options = {}) {
  console.log("\n" + "█".repeat(80));
  console.log("K_DA TOOLS - Complete Workflow");
  console.log("█".repeat(80));

  try {
    // Step 1: Deobfuscate
    await deobfuscate(options.input);

    // Step 2: Split file
    splitFile();

    // Step 3: Extract i18n
    extractI18n();

    // Step 4: Extract strings
    extractStrings();

    // Step 5: Configure
    configure(options);

    // Step 6: Build
    build();

    // Summary
    section("COMPLETE!");
    success("All steps completed successfully");
    console.log("\nGenerated files:");
    console.log("  • k_da_deobfuscated.js - Deobfuscated source");
    console.log("  • src/ - Split source files");
    console.log("  • src/i18n/ - Localization files");
    console.log("  • .env - Configuration file");
    console.log("  • k_da.js - Built executable");
    console.log("  • STRING_EXTRACTION_REPORT.md - Extraction report");
    console.log("\nTo run: bun k_da.js --help\n");
  } catch (err) {
    error(`Workflow failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];

      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  // Show help
  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    console.log(`
K_DA Tools - Integrated deobfuscation and build configuration tool

Usage:
  bun k_da-tools.js <command> [options]

Commands:
  deobfuscate    Deobfuscate original.js into readable format
  split          Split deobfuscated file into source files
  extract-i18n   Extract localization files and banners
  extract-strings Extract Unicode strings and URLs
  configure      Configure environment and customization
  build          Build k_da.js from source files
  all            Run complete workflow (all steps)
  help           Show this help message

Options (for 'all' or 'configure'):
  --input <file>         Input file for deobfuscation (default: original.js)
  --app-name <name>      Custom application name (default: K_DA CLI)
  --company-name <name>  Custom company name (default: Koda)
  --disable-telemetry    Disable telemetry (default: true)
  --disable-tracking     Disable tracking (default: true)

Examples:
  # Complete workflow
  bun k_da-tools.js all

  # Custom branding
  bun k_da-tools.js all --app-name "My CLI" --company-name "MyCompany"

  # Individual steps
  bun k_da-tools.js deobfuscate
  bun k_da-tools.js split
  bun k_da-tools.js extract-i18n
  bun k_da-tools.js configure --app-name "My CLI"
  bun k_da-tools.js build

Workflow:
  1. Deobfuscate: Extracts source code from original.js
  2. Split: Splits into manageable source files (webpack, react, npm, app, main)
  3. Extract i18n: Extracts localization files and ASCII banners
  4. Extract strings: Converts Unicode, extracts URLs
  5. Configure: Sets up .env, customizes branding, disables tracking
  6. Build: Builds final k_da.js executable

For more information, see the documentation in k_da/ directory.
`);
    process.exit(0);
  }

  // Execute command
  switch (command) {
    case "deobfuscate":
      await deobfuscate(options.input || "original.js");
      break;

    case "split":
      splitFile();
      break;

    case "extract-i18n":
      extractI18n();
      break;

    case "extract-strings":
      extractStrings();
      break;

    case "configure":
      configure(options);
      break;

    case "build":
      build();
      break;

    case "all":
      await runAll(options);
      break;

    default:
      error(`Unknown command: ${command}`);
      console.log('Run "node k_da-tools.js help" for usage information');
      process.exit(1);
  }
}

// Run CLI
if (require.main === module) {
  main().catch((err) => {
    error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  deobfuscate,
  splitFile,
  extractI18n,
  extractStrings,
  configure,
  build,
  runAll,
};
