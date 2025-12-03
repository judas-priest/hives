/**
 * POLZA.md Loader
 * Loads custom instructions from POLZA.md files (inspired by GEMINI.md)
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Load POLZA.md files from various locations
 * Priority order:
 * 1. Current directory
 * 2. Parent directories (up to root)
 * 3. User home directory (~/.polza-cli/POLZA.md)
 * 4. Global config directory (~/.config/polza-cli/POLZA.md)
 */
export class PolzaMdLoader {
  constructor() {
    this.instructions = '';
    this.loadedFiles = [];
  }

  /**
   * Load all POLZA.md files
   */
  async load() {
    const files = [];

    // 1. Check current directory and parents
    const projectFiles = await this.findProjectPolzaFiles();
    files.push(...projectFiles);

    // 2. Check user home directory
    const homeFile = path.join(os.homedir(), '.polza-cli', 'POLZA.md');
    if (existsSync(homeFile)) {
      files.push(homeFile);
    }

    // 3. Check global config directory
    const configDir = this.getConfigDir();
    const globalFile = path.join(configDir, 'POLZA.md');
    if (existsSync(globalFile) && globalFile !== homeFile) {
      files.push(globalFile);
    }

    // Load and combine all files
    const contents = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (content.trim()) {
          contents.push(`# From ${file}\n\n${content}`);
          this.loadedFiles.push(file);
        }
      } catch (error) {
        // Skip files that can't be read
        console.error(`Warning: Could not read ${file}: ${error.message}`);
      }
    }

    // Combine all instructions
    if (contents.length > 0) {
      this.instructions = contents.join('\n\n---\n\n');
    }

    return this.instructions;
  }

  /**
   * Find POLZA.md files in current directory and parents
   */
  async findProjectPolzaFiles() {
    const files = [];
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    // Walk up the directory tree
    while (currentDir !== root) {
      const polzaFile = path.join(currentDir, 'POLZA.md');
      if (existsSync(polzaFile)) {
        files.push(polzaFile);
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root
      }
      currentDir = parentDir;
    }

    // Check root directory
    const rootPolzaFile = path.join(root, 'POLZA.md');
    if (existsSync(rootPolzaFile)) {
      files.push(rootPolzaFile);
    }

    // Return in order from most specific to least specific
    return files.reverse();
  }

  /**
   * Get config directory
   */
  getConfigDir() {
    if (process.platform === 'win32') {
      return path.join(os.homedir(), 'AppData', 'Local', 'polza-cli');
    } else if (process.platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support', 'polza-cli');
    } else {
      return path.join(os.homedir(), '.config', 'polza-cli');
    }
  }

  /**
   * Get loaded instructions
   */
  getInstructions() {
    return this.instructions;
  }

  /**
   * Get list of loaded files
   */
  getLoadedFiles() {
    return this.loadedFiles;
  }

  /**
   * Check if any instructions were loaded
   */
  hasInstructions() {
    return this.instructions.length > 0;
  }

  /**
   * Create a system message with the instructions
   */
  createSystemMessage() {
    if (!this.hasInstructions()) {
      return null;
    }

    return {
      role: 'system',
      content: `# Custom Instructions from POLZA.md\n\n${this.instructions}\n\n---\n\nPlease follow these custom instructions when appropriate.`
    };
  }

  /**
   * Reload instructions
   */
  async reload() {
    this.instructions = '';
    this.loadedFiles = [];
    return await this.load();
  }
}

/**
 * Create a default POLZA.md file in current directory
 */
export async function createDefaultPolzaMd(filePath = 'POLZA.md') {
  const defaultContent = `# POLZA.md - Custom Instructions

This file contains custom instructions for Polza CLI. The AI will read and follow these instructions when responding to your prompts.

## Example Instructions

<!-- You can customize the AI's behavior by adding instructions here -->

### Coding Style
- Use functional programming patterns when appropriate
- Prefer const over let, avoid var
- Write descriptive variable and function names
- Add JSDoc comments for functions

### Project Context
<!-- Add information about your project -->
- Project: [Your Project Name]
- Tech Stack: [e.g., Node.js, React, PostgreSQL]
- Conventions: [Any specific conventions to follow]

### Response Style
- Be concise and to the point
- Provide code examples when helpful
- Explain complex concepts simply

## Tips

- POLZA.md files are loaded from:
  1. Current directory (most specific)
  2. Parent directories
  3. ~/.polza-cli/POLZA.md (user-level)
  4. ~/.config/polza-cli/POLZA.md (global)

- More specific instructions take precedence
- You can have project-specific POLZA.md in each project
- Use markdown formatting for better readability
`;

  await fs.writeFile(filePath, defaultContent, 'utf-8');
  return filePath;
}
