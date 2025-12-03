/**
 * Settings Manager
 * Manages user settings and preferences
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export class SettingsManager {
  constructor() {
    this.homeDir = os.homedir();
    this.configDir = path.join(this.homeDir, '.config', 'polza-cli');
    this.settingsFile = path.join(this.configDir, 'settings.json');
    this.settings = this.getDefaultSettings();
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      model: process.env.POLZA_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5',
      temperature: parseFloat(process.env.POLZA_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.POLZA_MAX_TOKENS || '4096', 10),
      markdownEnabled: true,
      yolomode: false,
      autoSave: true,
      logLevel: 'info',
      theme: 'default',
      aliases: {},
      customPrompts: {}
    };
  }

  /**
   * Initialize settings
   */
  async initialize() {
    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      await fs.mkdir(this.configDir, { recursive: true });
    }

    // Load existing settings
    if (existsSync(this.settingsFile)) {
      try {
        const data = await fs.readFile(this.settingsFile, 'utf-8');
        const loaded = JSON.parse(data);
        this.settings = { ...this.getDefaultSettings(), ...loaded };
      } catch (error) {
        console.error('Failed to load settings:', error.message);
      }
    }

    // Save to ensure file exists
    await this.save();
  }

  /**
   * Save settings to disk
   */
  async save() {
    try {
      await fs.writeFile(
        this.settingsFile,
        JSON.stringify(this.settings, null, 2),
        'utf-8'
      );
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      return false;
    }
  }

  /**
   * Get a setting value
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * Set a setting value
   */
  async set(key, value) {
    this.settings[key] = value;
    await this.save();
    return true;
  }

  /**
   * Get all settings
   */
  getAll() {
    return { ...this.settings };
  }

  /**
   * Reset to defaults
   */
  async reset() {
    this.settings = this.getDefaultSettings();
    await this.save();
    return true;
  }

  /**
   * Update multiple settings
   */
  async update(updates) {
    this.settings = { ...this.settings, ...updates };
    await this.save();
    return true;
  }

  /**
   * Get settings file path
   */
  getSettingsPath() {
    return this.settingsFile;
  }
}
