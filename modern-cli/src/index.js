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
import { startTUI } from './tui-mode.js';
import { showBanner } from './ui/banner.js';
import { getVersion } from './utils/version.js';
import { PROVIDERS, getDefaultModel, validateProviderConfig } from './lib/provider-factory.js';
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
    .option('provider', {
      type: 'string',
      description: 'AI provider to use (polza or kodacode)',
      default: process.env.AI_PROVIDER || 'polza',
      choices: ['polza', 'kodacode'],
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'AI model to use',
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
    .option('tui', {
      type: 'boolean',
      description: 'Start in TUI (Text User Interface) mode with full-screen interface',
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

  // Determine provider and validate credentials
  const provider = argv.provider || PROVIDERS.POLZA;

  // Validate provider configuration
  const providerConfig = {
    provider,
    polzaApiKey: process.env.POLZA_API_KEY,
    githubToken: process.env.GITHUB_TOKEN,
  };

  const validation = validateProviderConfig(providerConfig);
  if (!validation.valid) {
    console.error(chalk.red.bold('\n✗ Configuration Error:'));
    validation.errors.forEach(error => {
      console.error(chalk.yellow(`  • ${error}`));
    });
    console.error('');

    if (provider === PROVIDERS.POLZA) {
      console.error(chalk.cyan('  For Polza AI:'));
      console.error(chalk.cyan('    export POLZA_API_KEY=ak_your_key_here'));
    } else if (provider === PROVIDERS.KODACODE) {
      console.error(chalk.cyan('  For Kodacode:'));
      console.error(chalk.cyan('    export GITHUB_TOKEN=your_github_token'));
    }
    console.error('');
    process.exit(1);
  }

  // Merge yolo and yolomode flags
  const yoloMode = argv.yolo || argv.yolomode;

  // Determine model based on provider and user input
  let defaultModel;
  if (provider === PROVIDERS.KODACODE) {
    defaultModel = process.env.KODACODE_DEFAULT_MODEL || getDefaultModel(PROVIDERS.KODACODE);
  } else {
    defaultModel = process.env.POLZA_DEFAULT_MODEL || getDefaultModel(PROVIDERS.POLZA);
  }

  // Build configuration
  const config = {
    provider,
    model: argv.model || defaultModel,
    outputFormat: argv.outputFormat,
    includedDirectories: argv.includeDirectories
      ? argv.includeDirectories.split(',').map(d => d.trim())
      : [],
    yoloMode,
    stream: true, // Enable streaming by default (can be toggled with /stream command)

    // Provider-specific configuration
    polzaApiKey: process.env.POLZA_API_KEY,
    polzaApiBase: process.env.POLZA_API_BASE || 'https://api.polza.ai/api/v1',
    githubToken: process.env.GITHUB_TOKEN,
    kodacodeApiBase: process.env.KODACODE_API_BASE || 'https://api.kodacode.ru/v1',
  };

  // Non-interactive mode
  if (argv.prompt) {
    await runNonInteractive(argv.prompt, config);
    return;
  }

  // TUI mode
  if (argv.tui) {
    await startTUI(config);
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
