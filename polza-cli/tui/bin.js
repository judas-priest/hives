#!/usr/bin/env node

/**
 * Binary entry point for polza-tui
 * This wrapper ensures tsx is used to properly handle JSX files
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tuiFile = join(__dirname, "tui.js");
const tsxBin = join(__dirname, "..", "node_modules", ".bin", "tsx");

// Check if tsx is installed locally
if (!existsSync(tsxBin)) {
  console.error("\n❌ Error: tsx is not installed.");
  console.error("\nThe TUI requires dependencies to be installed first.");
  console.error("Please run one of the following commands:\n");
  console.error("  npm install    # Install with npm");
  console.error("  bun install    # Install with bun");
  console.error("  yarn install   # Install with yarn\n");
  console.error("Then run the TUI again with:");
  console.error("  npm run tui");
  console.error("  bun run tui");
  console.error("  node tui/bin.js\n");
  process.exit(1);
}

// Run with local tsx to ensure proper module resolution
const child = spawn(tsxBin, [tuiFile], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
