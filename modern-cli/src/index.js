#!/usr/bin/env node

/**
 * Modern CLI Client - Inspired by Gemini CLI
 * Powered by Polza AI
 *
 * A modern, beautiful command-line interface for AI-powered assistance
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startInteractive } from './interactive.js';
import { runNonInteractive } from './non-interactive.js';
import { showBanner } from './ui/banner.js';
import { getVersion } from './utils/version.js';
import chalk from 'chalk';

/**
 * Main entry point
 */
async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName('hives-cli')
    .usage('$0 [options]')
    .option('prompt', {
      alias: 'p',
      type: 'string',
      description: 'Run in non-interactive mode with a single prompt',
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'AI model to use',
      default: process.env.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5',
    })
    .option('output-format', {
      alias: 'o',
      type: 'string',
      description: 'Output format (text, json, stream-json)',
      default: 'text',
      choices: ['text', 'json', 'stream-json'],
    })
    .option('include-directories', {
      type: 'string',
      description: 'Additional directories to include (comma-separated)',
    })
    .option('yolo', {
      type: 'boolean',
      description: 'Enable YOLO mode (auto-approve shell commands)',
      default: false,
    })
    .option('yolomode', {
      type: 'boolean',
      description: 'Alias for --yolo',
      default: false,
    })
    .version(getVersion())
    .alias('version', 'v')
    .help()
    .alias('help', 'h')
    .example('$0', 'Start interactive mode')
    .example('$0 -p "Explain async/await"', 'Non-interactive prompt')
    .example('$0 -m openai/gpt-4o --yolo', 'Use GPT-4 with YOLO mode')
    .epilogue('For more information, visit: https://github.com/judas-priest/hives')
    .parse();

  // Check for API key
  if (!process.env.POLZA_API_KEY) {
    console.error(chalk.red.bold('\n✗ Error: Polza API key is required'));
    console.error(chalk.yellow('Set POLZA_API_KEY environment variable:'));
    console.error(chalk.cyan('  export POLZA_API_KEY=ak_your_key_here\n'));
    process.exit(1);
  }

  // Merge yolo and yolomode flags
  const yoloMode = argv.yolo || argv.yolomode;

  // Build configuration
  const config = {
    model: argv.model,
    outputFormat: argv.outputFormat,
    includedDirectories: argv.includeDirectories
      ? argv.includeDirectories.split(',').map(d => d.trim())
      : [],
    yoloMode,
    apiKey: process.env.POLZA_API_KEY,
    apiBase: process.env.POLZA_API_BASE || 'https://api.polza.ai/api/v1',
  };

  // Non-interactive mode
  if (argv.prompt) {
    await runNonInteractive(argv.prompt, config);
    return;
  }

  // Interactive mode - show banner
  showBanner();

  // Start interactive session
  await startInteractive(config);
}

// Error handling
main().catch((error) => {
  console.error(chalk.red.bold('\n✗ Fatal Error:'), error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
