/**
 * Vim Mode - Vim keybindings for readline
 */

import chalk from 'chalk';

/**
 * Vim Mode Manager
 */
export class VimMode {
  constructor(rl, settingsManager) {
    this.rl = rl;
    this.settingsManager = settingsManager;
    this.enabled = false;
    this.mode = 'insert'; // 'normal' or 'insert'
    this.register = ''; // For yank/paste
    this.commandBuffer = ''; // For multi-key commands like 'dd', 'yy'
    this.lastCommand = null;
    this.originalPrompt = '';
  }

  /**
   * Initialize vim mode from settings
   */
  async initialize() {
    const settings = this.settingsManager.getAll();
    this.enabled = settings.vimMode?.enabled || false;

    if (this.enabled) {
      this.enable();
    }
  }

  /**
   * Enable vim mode
   */
  enable() {
    this.enabled = true;
    this.mode = 'insert';
    this.setupKeybindings();
    this.updatePrompt();
    console.log(chalk.green('\n✓ Vim mode enabled'));
    console.log(chalk.gray('Press ESC for normal mode, i for insert mode\n'));
  }

  /**
   * Disable vim mode
   */
  disable() {
    this.enabled = false;
    this.resetKeybindings();
    this.rl.setPrompt(this.originalPrompt);
    console.log(chalk.gray('\n✓ Vim mode disabled\n'));
  }

  /**
   * Toggle vim mode
   */
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Setup vim keybindings
   */
  setupKeybindings() {
    if (!this.rl || !this.rl.input) {
      return;
    }

    const input = this.rl.input;

    // Store original prompt
    this.originalPrompt = this.rl.getPrompt();

    // Listen for key presses
    input.on('keypress', this.handleKeypress.bind(this));

    console.log(chalk.gray('Vim mode keybindings configured'));
  }

  /**
   * Reset keybindings
   */
  resetKeybindings() {
    if (!this.rl || !this.rl.input) {
      return;
    }

    // Remove our keypress listener
    this.rl.input.removeListener('keypress', this.handleKeypress.bind(this));
  }

  /**
   * Handle keypress in vim mode
   */
  handleKeypress(char, key) {
    if (!this.enabled || !key) {
      return;
    }

    // Allow Tab key to pass through for autocomplete in both modes
    // This is critical for fuzzy search and file completion to work
    if (key.name === 'tab') {
      return;
    }

    // In insert mode, allow most keys to pass through normally
    // Only intercept ESC to switch to normal mode
    if (this.mode === 'insert') {
      if (key.name === 'escape') {
        this.switchToNormal();
        return;
      }
      // Let all other keys in insert mode pass through to readline
      return;
    }

    // ESC in normal mode (no-op)
    if (key.name === 'escape') {
      return;
    }

    // Handle normal mode separately
    if (this.mode === 'normal') {
      this.handleNormalMode(char, key);
    }
  }

  /**
   * Handle keypress in normal mode
   */
  handleNormalMode(char, key) {
    const line = this.rl.line || '';
    const cursor = this.rl.cursor || 0;

    // Build command buffer for multi-key commands
    if (this.commandBuffer) {
      this.commandBuffer += char || key.name;

      // Check if we have a complete command
      if (this.executeCommand(this.commandBuffer)) {
        this.commandBuffer = '';
      } else if (this.commandBuffer.length > 2) {
        // Invalid command, clear buffer
        this.commandBuffer = '';
      }
      return;
    }

    switch (key.name) {
      // Movement
      case 'h': // Left
        if (cursor > 0) {
          this.rl.cursor--;
        }
        break;

      case 'l': // Right
        if (cursor < line.length) {
          this.rl.cursor++;
        }
        break;

      case 'j': // Down (history)
        this.rl.historyIndex = Math.min(
          this.rl.historyIndex + 1,
          this.rl.history.length - 1
        );
        if (this.rl.history[this.rl.historyIndex]) {
          this.rl.line = this.rl.history[this.rl.historyIndex];
          this.rl.cursor = this.rl.line.length;
        }
        break;

      case 'k': // Up (history)
        this.rl.historyIndex = Math.max(this.rl.historyIndex - 1, 0);
        if (this.rl.history[this.rl.historyIndex]) {
          this.rl.line = this.rl.history[this.rl.historyIndex];
          this.rl.cursor = this.rl.line.length;
        }
        break;

      case 'w': // Next word
        this.moveToNextWord();
        break;

      case 'b': // Previous word
        this.moveToPreviousWord();
        break;

      case 'e': // End of word
        this.moveToEndOfWord();
        break;

      case '0': // Beginning of line
      case 'home':
        this.rl.cursor = 0;
        break;

      case '$': // End of line
      case 'end':
        this.rl.cursor = line.length;
        break;

      // Insert mode
      case 'i': // Insert before cursor
        this.switchToInsert();
        break;

      case 'a': // Insert after cursor
        if (cursor < line.length) {
          this.rl.cursor++;
        }
        this.switchToInsert();
        break;

      case 'A': // Insert at end of line
        this.rl.cursor = line.length;
        this.switchToInsert();
        break;

      case 'I': // Insert at beginning of line
        this.rl.cursor = 0;
        this.switchToInsert();
        break;

      // Delete
      case 'x': // Delete character under cursor
        if (cursor < line.length) {
          this.rl.line = line.slice(0, cursor) + line.slice(cursor + 1);
        }
        break;

      case 'X': // Delete character before cursor
        if (cursor > 0) {
          this.rl.line = line.slice(0, cursor - 1) + line.slice(cursor);
          this.rl.cursor--;
        }
        break;

      case 'd': // Start delete command
        this.commandBuffer = 'd';
        break;

      case 'D': // Delete to end of line
        this.register = line.slice(cursor);
        this.rl.line = line.slice(0, cursor);
        break;

      // Change (delete and insert)
      case 'c': // Start change command
        this.commandBuffer = 'c';
        break;

      case 'C': // Change to end of line
        this.register = line.slice(cursor);
        this.rl.line = line.slice(0, cursor);
        this.switchToInsert();
        break;

      // Yank (copy)
      case 'y': // Start yank command
        this.commandBuffer = 'y';
        break;

      case 'Y': // Yank line
        this.register = line;
        break;

      // Paste
      case 'p': // Paste after cursor
        if (this.register) {
          this.rl.line = line.slice(0, cursor + 1) + this.register + line.slice(cursor + 1);
          this.rl.cursor = cursor + this.register.length;
        }
        break;

      case 'P': // Paste before cursor
        if (this.register) {
          this.rl.line = line.slice(0, cursor) + this.register + line.slice(cursor);
          this.rl.cursor = cursor + this.register.length - 1;
        }
        break;

      // Undo
      case 'u': // Undo (simplified)
        if (this.lastCommand) {
          // In a real implementation, we'd have a full undo stack
          console.log(chalk.yellow('Undo not fully implemented'));
        }
        break;

      // Replace
      case 'r': // Replace character (next keystroke)
        this.commandBuffer = 'r';
        break;

      default:
        // Ignore other keys in normal mode
        break;
    }

    this.rl._refreshLine();
  }

  /**
   * Handle keypress in insert mode
   *
   * Note: This function is now deprecated as insert mode handling
   * is done directly in handleKeypress() for better compatibility
   * with readline's built-in features (autocomplete, history, etc.)
   */
  handleInsertMode(char, key) {
    // Deprecated - kept for backwards compatibility
    // Insert mode now passes through all keys except ESC
  }

  /**
   * Execute multi-key command
   */
  executeCommand(command) {
    const line = this.rl.line || '';
    const cursor = this.rl.cursor || 0;

    switch (command) {
      case 'dd': // Delete line
        this.register = line;
        this.rl.line = '';
        this.rl.cursor = 0;
        return true;

      case 'yy': // Yank line
        this.register = line;
        return true;

      case 'cc': // Change line
        this.register = line;
        this.rl.line = '';
        this.rl.cursor = 0;
        this.switchToInsert();
        return true;

      case 'dw': // Delete word
        const nextWordPos = this.getNextWordPosition();
        this.register = line.slice(cursor, nextWordPos);
        this.rl.line = line.slice(0, cursor) + line.slice(nextWordPos);
        return true;

      case 'cw': // Change word
        const nextWordPos2 = this.getNextWordPosition();
        this.register = line.slice(cursor, nextWordPos2);
        this.rl.line = line.slice(0, cursor) + line.slice(nextWordPos2);
        this.switchToInsert();
        return true;

      default:
        // Check for 'r' + character (replace)
        if (command.startsWith('r') && command.length === 2) {
          const replaceChar = command[1];
          if (cursor < line.length) {
            this.rl.line = line.slice(0, cursor) + replaceChar + line.slice(cursor + 1);
          }
          return true;
        }
        return false;
    }
  }

  /**
   * Switch to normal mode
   */
  switchToNormal() {
    this.mode = 'normal';
    this.updatePrompt();
    this.commandBuffer = '';
  }

  /**
   * Switch to insert mode
   */
  switchToInsert() {
    this.mode = 'insert';
    this.updatePrompt();
    this.commandBuffer = '';
  }

  /**
   * Update prompt to show current mode
   */
  updatePrompt() {
    if (!this.enabled) {
      return;
    }

    const modeIndicator = this.mode === 'normal'
      ? chalk.blue('[NORMAL]')
      : chalk.green('[INSERT]');

    const basePrompt = this.originalPrompt.replace(/\[NORMAL\]|\[INSERT\]/g, '').trim();
    this.rl.setPrompt(`${modeIndicator} ${basePrompt} `);
    this.rl._refreshLine();
  }

  /**
   * Move cursor to next word
   */
  moveToNextWord() {
    const line = this.rl.line || '';
    let cursor = this.rl.cursor || 0;

    // Skip current word
    while (cursor < line.length && !this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    // Skip whitespace
    while (cursor < line.length && this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    this.rl.cursor = cursor;
  }

  /**
   * Move cursor to previous word
   */
  moveToPreviousWord() {
    const line = this.rl.line || '';
    let cursor = this.rl.cursor || 0;

    if (cursor === 0) return;

    cursor--;

    // Skip whitespace
    while (cursor > 0 && this.isWordBoundary(line[cursor])) {
      cursor--;
    }

    // Skip word
    while (cursor > 0 && !this.isWordBoundary(line[cursor - 1])) {
      cursor--;
    }

    this.rl.cursor = cursor;
  }

  /**
   * Move cursor to end of word
   */
  moveToEndOfWord() {
    const line = this.rl.line || '';
    let cursor = this.rl.cursor || 0;

    // Move forward at least one position
    if (cursor < line.length) {
      cursor++;
    }

    // Skip whitespace
    while (cursor < line.length && this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    // Move to end of word
    while (cursor < line.length && !this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    // Back up one to be ON the last character
    if (cursor > 0) {
      cursor--;
    }

    this.rl.cursor = cursor;
  }

  /**
   * Get next word position
   */
  getNextWordPosition() {
    const line = this.rl.line || '';
    let cursor = this.rl.cursor || 0;

    // Skip current word
    while (cursor < line.length && !this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    // Skip whitespace
    while (cursor < line.length && this.isWordBoundary(line[cursor])) {
      cursor++;
    }

    return cursor;
  }

  /**
   * Check if character is a word boundary
   */
  isWordBoundary(char) {
    return /\s/.test(char);
  }

  /**
   * Save vim mode preference to settings
   */
  async savePreference(enabled) {
    await this.settingsManager.set('vimMode.enabled', enabled);
    this.enabled = enabled;
  }
}

export default VimMode;
