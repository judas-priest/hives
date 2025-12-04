/**
 * Settings System - Hierarchical configuration management
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import os from 'os';
import chalk from 'chalk';

const GLOBAL_SETTINGS_DIR = path.join(os.homedir(), '.hives-cli');
const GLOBAL_SETTINGS_FILE = path.join(GLOBAL_SETTINGS_DIR, 'settings.json');
const PROJECT_SETTINGS_FILE = path.join(process.cwd(), '.hives', 'settings.json');

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  general: {
    model: 'claude-3-5-sonnet-latest',
    stream: true,
    yoloMode: false,
    contextFiles: true,
    customCommands: true,
    checkpointing: false,
  },
  ui: {
    theme: 'default',
    showBanner: true,
    markdown: true,
    syntaxHighlight: true,
    showTips: true,
    vimMode: false,
  },
  session: {
    autoSave: false,
    autoLoad: false,
    maxSessions: 50,
    exportFormat: 'markdown', // markdown or json
  },
  context: {
    loadGlobal: true,
    loadProject: true,
    loadSubdirectories: true,
    maxContextSize: 100000, // characters
  },
  tools: {
    webFetch: true,
    shellExecution: false, // requires yolo mode
    fileOperations: true,
  },
  shell: {
    yoloMode: false, // Auto-approve all commands
    confirmDangerous: true, // Ask for confirmation on dangerous commands
    dangerousCommands: [
      'rm', 'rmdir', 'del', 'delete',
      'chmod', 'chown', 'chgrp',
      'mv', 'move',
      'dd', 'format', 'mkfs',
      'kill', 'killall', 'pkill',
      'shutdown', 'reboot', 'halt', 'poweroff',
      'sudo', 'su',
      'apt', 'yum', 'dnf', 'pacman', 'brew', 'npm', 'pip', 'gem',
    ],
    timeout: 30000, // 30 seconds
    maxBuffer: 5242880, // 5MB
    persistentMode: false, // Start in persistent shell mode
  },
  advanced: {
    apiBase: 'https://api.polza.ai/v1',
    timeout: 30000,
    maxRetries: 3,
    debug: false,
  },
};

/**
 * Settings Manager
 */
export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.globalSettings = {};
    this.projectSettings = {};
  }

  /**
   * Load settings from all levels (global + project)
   */
  async loadSettings() {
    // Load global settings
    if (existsSync(GLOBAL_SETTINGS_FILE)) {
      try {
        const data = await fs.readFile(GLOBAL_SETTINGS_FILE, 'utf-8');
        this.globalSettings = JSON.parse(data);
      } catch (error) {
        console.error(chalk.yellow(`⚠️  Failed to load global settings: ${error.message}`));
      }
    }

    // Load project settings
    if (existsSync(PROJECT_SETTINGS_FILE)) {
      try {
        const data = await fs.readFile(PROJECT_SETTINGS_FILE, 'utf-8');
        this.projectSettings = JSON.parse(data);
      } catch (error) {
        console.error(chalk.yellow(`⚠️  Failed to load project settings: ${error.message}`));
      }
    }

    // Merge settings with precedence: defaults < global < project
    this.settings = this.mergeSettings(
      DEFAULT_SETTINGS,
      this.globalSettings,
      this.projectSettings
    );

    return this.settings;
  }

  /**
   * Deep merge settings objects
   */
  mergeSettings(...sources) {
    const result = {};

    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.mergeSettings(result[key] || {}, value);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Get all settings
   */
  getAll() {
    return this.settings;
  }

  /**
   * Get a setting value by path (e.g., 'ui.theme')
   */
  get(path) {
    const keys = path.split('.');
    let value = this.settings;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set a setting value by path
   */
  set(path, value, scope = 'global') {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = scope === 'global' ? this.globalSettings : this.projectSettings;

    let current = target;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;

    // Reload merged settings
    this.settings = this.mergeSettings(
      DEFAULT_SETTINGS,
      this.globalSettings,
      this.projectSettings
    );
  }

  /**
   * Save settings to file
   */
  async saveSettings(scope = 'global') {
    const settingsFile = scope === 'global' ? GLOBAL_SETTINGS_FILE : PROJECT_SETTINGS_FILE;
    const settingsDir = path.dirname(settingsFile);
    const data = scope === 'global' ? this.globalSettings : this.projectSettings;

    try {
      await fs.mkdir(settingsDir, { recursive: true });
      await fs.writeFile(settingsFile, JSON.stringify(data, null, 2));
      console.log(chalk.green(`\n✓ Settings saved to ${scope} config`));
      console.log(chalk.gray(`  ${settingsFile}\n`));
      return true;
    } catch (error) {
      console.error(chalk.red(`\n✗ Failed to save settings: ${error.message}\n`));
      return false;
    }
  }

  /**
   * Show all settings
   */
  showSettings() {
    console.log(chalk.cyan.bold('\n⚙️  Current Settings:\n'));

    this.displaySettingsSection('General', this.settings.general);
    this.displaySettingsSection('UI', this.settings.ui);
    this.displaySettingsSection('Session', this.settings.session);
    this.displaySettingsSection('Context', this.settings.context);
    this.displaySettingsSection('Tools', this.settings.tools);
    this.displaySettingsSection('Shell', this.settings.shell);
    this.displaySettingsSection('Advanced', this.settings.advanced);

    console.log(chalk.cyan('\n📂 Configuration Files:\n'));
    console.log(`  ${chalk.green('Global:'.padEnd(12))} ${chalk.gray(GLOBAL_SETTINGS_FILE)}`);
    console.log(`    ${chalk.dim(existsSync(GLOBAL_SETTINGS_FILE) ? '✓ Exists' : '✗ Not found')}`);
    console.log(`  ${chalk.green('Project:'.padEnd(12))} ${chalk.gray(PROJECT_SETTINGS_FILE)}`);
    console.log(`    ${chalk.dim(existsSync(PROJECT_SETTINGS_FILE) ? '✓ Exists' : '✗ Not found')}`);
    console.log();
  }

  /**
   * Display a settings section
   */
  displaySettingsSection(title, settings) {
    console.log(chalk.green(`  ${title}:`));
    for (const [key, value] of Object.entries(settings)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const displayValue = valueStr.length > 60 ? valueStr.substring(0, 60) + '...' : valueStr;
      console.log(`    ${chalk.cyan(key.padEnd(20))} ${chalk.gray(displayValue)}`);
    }
    console.log();
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(scope = 'global') {
    if (scope === 'global') {
      this.globalSettings = {};
    } else {
      this.projectSettings = {};
    }

    this.settings = this.mergeSettings(
      DEFAULT_SETTINGS,
      this.globalSettings,
      this.projectSettings
    );

    await this.saveSettings(scope);
    console.log(chalk.green(`\n✓ ${scope} settings reset to defaults\n`));
  }

  /**
   * Export settings to a file
   */
  async exportSettings(outputPath) {
    try {
      await fs.writeFile(outputPath, JSON.stringify(this.settings, null, 2));
      console.log(chalk.green(`\n✓ Settings exported to:`));
      console.log(chalk.gray(`  ${outputPath}\n`));
      return true;
    } catch (error) {
      console.error(chalk.red(`\n✗ Failed to export settings: ${error.message}\n`));
      return false;
    }
  }

  /**
   * Import settings from a file
   */
  async importSettings(inputPath, scope = 'global') {
    try {
      const data = await fs.readFile(inputPath, 'utf-8');
      const imported = JSON.parse(data);

      if (scope === 'global') {
        this.globalSettings = imported;
      } else {
        this.projectSettings = imported;
      }

      this.settings = this.mergeSettings(
        DEFAULT_SETTINGS,
        this.globalSettings,
        this.projectSettings
      );

      await this.saveSettings(scope);
      console.log(chalk.green(`\n✓ Settings imported from:`));
      console.log(chalk.gray(`  ${inputPath}\n`));
      return true;
    } catch (error) {
      console.error(chalk.red(`\n✗ Failed to import settings: ${error.message}\n`));
      return false;
    }
  }
}

/**
 * Create default settings file
 */
export async function createDefaultSettings(scope = 'global') {
  const settingsFile = scope === 'global' ? GLOBAL_SETTINGS_FILE : PROJECT_SETTINGS_FILE;
  const settingsDir = path.dirname(settingsFile);

  if (existsSync(settingsFile)) {
    console.log(chalk.yellow(`\n⚠️  Settings file already exists at:`));
    console.log(chalk.gray(`   ${settingsFile}\n`));
    return false;
  }

  try {
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsFile, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    console.log(chalk.green(`\n✓ Created ${scope} settings file at:`));
    console.log(chalk.gray(`  ${settingsFile}\n`));
    console.log(chalk.cyan('💡 Tips:'));
    console.log(chalk.gray('  - Edit this file to customize your CLI'));
    console.log(chalk.gray('  - Use /settings to view current settings'));
    console.log(chalk.gray('  - Project settings override global settings\n'));
    return true;
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to create settings file:`));
    console.log(chalk.gray(`  ${error.message}\n`));
    return false;
  }
}
