/**
 * Theme System - Color themes for terminal UI
 */

import chalk from 'chalk';

/**
 * Built-in theme definitions
 */
export const themes = {
  default: {
    name: 'Default',
    description: 'Modern CLI default theme with vibrant colors',
    colors: {
      // Banner and branding
      banner: chalk.cyan.bold,
      version: chalk.gray,

      // Prompts
      userPrompt: chalk.green.bold,
      assistantPrompt: chalk.blue.bold,
      systemPrompt: chalk.yellow.bold,

      // Messages
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,

      // Markdown
      heading: chalk.cyan.bold,
      code: chalk.yellow,
      codeBlock: chalk.gray,
      link: chalk.blue.underline,
      emphasis: chalk.italic,
      strong: chalk.bold,

      // Commands
      command: chalk.magenta,
      commandResult: chalk.gray,

      // Misc
      dim: chalk.gray,
      highlight: chalk.bgBlue.white,
    }
  },

  dark: {
    name: 'Dark',
    description: 'Dark theme with muted colors',
    colors: {
      banner: chalk.blue.bold,
      version: chalk.gray.dim,

      userPrompt: chalk.white.bold,
      assistantPrompt: chalk.gray.bold,
      systemPrompt: chalk.yellow.dim,

      success: chalk.green.dim,
      error: chalk.red.dim,
      warning: chalk.yellow.dim,
      info: chalk.blue.dim,

      heading: chalk.white.bold,
      code: chalk.white,
      codeBlock: chalk.gray.dim,
      link: chalk.blue.dim,
      emphasis: chalk.white.italic,
      strong: chalk.white.bold,

      command: chalk.magenta.dim,
      commandResult: chalk.gray.dim,

      dim: chalk.gray.dim,
      highlight: chalk.bgBlue.white,
    }
  },

  light: {
    name: 'Light',
    description: 'Light theme with bright colors for light backgrounds',
    colors: {
      banner: chalk.blue.bold,
      version: chalk.black,

      userPrompt: chalk.green.bold,
      assistantPrompt: chalk.blue.bold,
      systemPrompt: chalk.yellow.bold,

      success: chalk.green.bold,
      error: chalk.red.bold,
      warning: chalk.yellow.bold,
      info: chalk.blue.bold,

      heading: chalk.blue.bold,
      code: chalk.magenta,
      codeBlock: chalk.black,
      link: chalk.blue.bold,
      emphasis: chalk.italic,
      strong: chalk.bold,

      command: chalk.magenta.bold,
      commandResult: chalk.black,

      dim: chalk.black,
      highlight: chalk.bgCyan.black,
    }
  },

  solarized: {
    name: 'Solarized',
    description: 'Solarized dark theme with balanced contrast',
    colors: {
      banner: chalk.cyan.bold,
      version: chalk.gray,

      userPrompt: chalk.green.bold,
      assistantPrompt: chalk.blue.bold,
      systemPrompt: chalk.yellow.bold,

      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,

      heading: chalk.cyan.bold,
      code: chalk.magenta,
      codeBlock: chalk.gray,
      link: chalk.blue,
      emphasis: chalk.italic,
      strong: chalk.bold,

      command: chalk.magenta,
      commandResult: chalk.gray,

      dim: chalk.gray,
      highlight: chalk.bgBlue.white,
    }
  },

  monokai: {
    name: 'Monokai',
    description: 'Monokai theme with vibrant syntax colors',
    colors: {
      banner: chalk.magenta.bold,
      version: chalk.gray,

      userPrompt: chalk.green.bold,
      assistantPrompt: chalk.cyan.bold,
      systemPrompt: chalk.yellow.bold,

      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.cyan,

      heading: chalk.magenta.bold,
      code: chalk.yellow,
      codeBlock: chalk.gray,
      link: chalk.cyan,
      emphasis: chalk.italic,
      strong: chalk.bold,

      command: chalk.magenta,
      commandResult: chalk.gray,

      dim: chalk.gray,
      highlight: chalk.bgMagenta.white,
    }
  },

  gruvbox: {
    name: 'Gruvbox',
    description: 'Gruvbox theme with warm retro colors',
    colors: {
      banner: chalk.yellow.bold,
      version: chalk.gray,

      userPrompt: chalk.green.bold,
      assistantPrompt: chalk.blue.bold,
      systemPrompt: chalk.yellow.bold,

      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,

      heading: chalk.yellow.bold,
      code: chalk.yellow,
      codeBlock: chalk.gray,
      link: chalk.blue,
      emphasis: chalk.italic,
      strong: chalk.bold,

      command: chalk.magenta,
      commandResult: chalk.gray,

      dim: chalk.gray,
      highlight: chalk.bgYellow.black,
    }
  },

  minimal: {
    name: 'Minimal',
    description: 'Minimal monochrome theme',
    colors: {
      banner: chalk.white.bold,
      version: chalk.gray,

      userPrompt: chalk.white.bold,
      assistantPrompt: chalk.gray.bold,
      systemPrompt: chalk.white.bold,

      success: chalk.white,
      error: chalk.white,
      warning: chalk.white,
      info: chalk.white,

      heading: chalk.white.bold,
      code: chalk.white,
      codeBlock: chalk.gray,
      link: chalk.white.underline,
      emphasis: chalk.white.italic,
      strong: chalk.white.bold,

      command: chalk.white,
      commandResult: chalk.gray,

      dim: chalk.gray,
      highlight: chalk.inverse,
    }
  }
};

/**
 * Theme Manager - Manages theme selection and application
 */
export class ThemeManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.currentTheme = 'default';
    this.customThemes = {};
  }

  /**
   * Load theme from settings
   */
  async loadTheme() {
    const settings = this.settingsManager.getAll();
    const themeName = settings.theme || 'default';

    // Load custom themes if defined
    if (settings.customThemes) {
      this.customThemes = settings.customThemes;
    }

    this.setTheme(themeName);
  }

  /**
   * Set active theme
   */
  setTheme(themeName) {
    if (!themes[themeName] && !this.customThemes[themeName]) {
      console.error(`Theme '${themeName}' not found. Using default theme.`);
      this.currentTheme = 'default';
      return false;
    }

    this.currentTheme = themeName;
    return true;
  }

  /**
   * Get current theme
   */
  getTheme() {
    // Check custom themes first
    if (this.customThemes[this.currentTheme]) {
      return this.parseCustomTheme(this.customThemes[this.currentTheme]);
    }

    return themes[this.currentTheme];
  }

  /**
   * Get all available themes
   */
  getAllThemes() {
    const builtInThemes = Object.keys(themes).map(key => ({
      id: key,
      name: themes[key].name,
      description: themes[key].description,
      custom: false
    }));

    const customThemesList = Object.keys(this.customThemes).map(key => ({
      id: key,
      name: this.customThemes[key].name || key,
      description: this.customThemes[key].description || 'Custom theme',
      custom: true
    }));

    return [...builtInThemes, ...customThemesList];
  }

  /**
   * Get color function for a specific element
   */
  getColor(element) {
    const theme = this.getTheme();
    return theme.colors[element] || chalk.white;
  }

  /**
   * Save theme preference to settings
   */
  async saveThemePreference(themeName) {
    await this.settingsManager.set('theme', themeName);
    this.currentTheme = themeName;
  }

  /**
   * Add custom theme
   */
  async addCustomTheme(name, themeDefinition) {
    this.customThemes[name] = themeDefinition;

    // Save to settings
    const customThemes = this.settingsManager.get('customThemes') || {};
    customThemes[name] = themeDefinition;
    await this.settingsManager.set('customThemes', customThemes);
  }

  /**
   * Remove custom theme
   */
  async removeCustomTheme(name) {
    if (!this.customThemes[name]) {
      return false;
    }

    delete this.customThemes[name];

    // Update settings
    const customThemes = this.settingsManager.get('customThemes') || {};
    delete customThemes[name];
    await this.settingsManager.set('customThemes', customThemes);

    // If current theme was deleted, switch to default
    if (this.currentTheme === name) {
      await this.saveThemePreference('default');
    }

    return true;
  }

  /**
   * Parse custom theme definition with hex colors
   */
  parseCustomTheme(customTheme) {
    const colors = {};

    for (const [key, value] of Object.entries(customTheme.colors || {})) {
      if (typeof value === 'string') {
        // Handle hex colors or chalk color names
        if (value.startsWith('#')) {
          colors[key] = chalk.hex(value);
        } else {
          // Try to use chalk color name
          colors[key] = this.parseChalkColor(value);
        }
      }
    }

    return {
      name: customTheme.name || 'Custom',
      description: customTheme.description || 'Custom theme',
      colors
    };
  }

  /**
   * Parse chalk color string like 'green.bold' or 'bgBlue.white'
   */
  parseChalkColor(colorString) {
    const parts = colorString.split('.');
    let color = chalk;

    for (const part of parts) {
      if (color[part]) {
        color = color[part];
      } else {
        console.warn(`Unknown chalk color modifier: ${part}`);
        return chalk.white;
      }
    }

    return color;
  }

  /**
   * Preview theme
   */
  previewTheme(themeName) {
    const previousTheme = this.currentTheme;

    if (!this.setTheme(themeName)) {
      return;
    }

    const theme = this.getTheme();

    console.log('\n' + theme.colors.banner(`╔════════════════════════════════════════╗`));
    console.log(theme.colors.banner(`║  Theme Preview: ${theme.name.padEnd(23)}║`));
    console.log(theme.colors.banner(`╚════════════════════════════════════════╝`) + '\n');

    console.log(theme.colors.heading('Heading Style'));
    console.log(theme.colors.userPrompt('You> ') + 'User message example');
    console.log(theme.colors.assistantPrompt('Assistant> ') + 'Assistant message example');
    console.log(theme.colors.code('inline code') + ' and ' + theme.colors.strong('bold text'));
    console.log(theme.colors.success('✓ Success message'));
    console.log(theme.colors.error('✗ Error message'));
    console.log(theme.colors.warning('⚠ Warning message'));
    console.log(theme.colors.info('ℹ Info message'));
    console.log(theme.colors.link('https://example.com'));
    console.log(theme.colors.dim('Dimmed text for less important info\n'));

    // Restore previous theme
    this.setTheme(previousTheme);
  }
}

export default ThemeManager;
