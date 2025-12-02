/**
 * TOML Command Loader
 * Loads custom commands from TOML files
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toml from 'toml';
import glob from 'fast-glob';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load custom commands from TOML files
 */
export class CommandLoader {
  constructor() {
    this.commands = new Map();
    this.commandsDirs = this.getCommandDirectories();
  }

  /**
   * Get directories where commands can be located
   */
  getCommandDirectories() {
    const dirs = [];

    // 1. User commands (~/.polza-cli/commands/)
    const homeDir = os.homedir();
    const userCommandsDir = path.join(homeDir, '.polza-cli', 'commands');
    dirs.push({ path: userCommandsDir, type: 'user' });

    // 2. Project commands (.polza/commands/ or polza-cli/commands/)
    const projectCommandsDir = path.join(process.cwd(), '.polza', 'commands');
    dirs.push({ path: projectCommandsDir, type: 'project' });

    // 3. Built-in commands (polza-cli/commands/)
    const builtinCommandsDir = path.join(__dirname, '..', '..', 'commands');
    dirs.push({ path: builtinCommandsDir, type: 'builtin' });

    return dirs;
  }

  /**
   * Load all commands from all directories
   */
  async loadCommands() {
    this.commands.clear();

    for (const dir of this.commandsDirs) {
      if (!existsSync(dir.path)) {
        continue;
      }

      try {
        // Find all .toml files
        const tomlFiles = await glob('**/*.toml', {
          cwd: dir.path,
          absolute: true
        });

        for (const file of tomlFiles) {
          try {
            await this.loadCommandFile(file, dir.type);
          } catch (error) {
            console.error(`Error loading command from ${file}:`, error.message);
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
        continue;
      }
    }

    return Array.from(this.commands.values());
  }

  /**
   * Load a single command file
   */
  async loadCommandFile(filePath, sourceType) {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = toml.parse(content);

    // Extract command name from filename
    const basename = path.basename(filePath, '.toml');
    const commandName = config.name || basename;

    // Validate required fields
    if (!config.prompt) {
      throw new Error(`Command ${commandName} is missing required 'prompt' field`);
    }

    const command = {
      name: commandName,
      description: config.description || `Custom command: ${commandName}`,
      prompt: config.prompt,
      file: filePath,
      sourceType: sourceType,
      args: config.args || null,
      examples: config.examples || []
    };

    // Handle name conflicts - project commands override user commands override builtin
    const existing = this.commands.get(commandName);
    if (existing) {
      const priority = { builtin: 1, user: 2, project: 3 };
      if (priority[sourceType] > priority[existing.sourceType]) {
        this.commands.set(commandName, command);
      }
    } else {
      this.commands.set(commandName, command);
    }
  }

  /**
   * Get a command by name
   */
  getCommand(name) {
    return this.commands.get(name);
  }

  /**
   * Get all commands
   */
  getAllCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * Check if a command exists
   */
  hasCommand(name) {
    return this.commands.has(name);
  }

  /**
   * Process command with arguments
   * Replaces {{args}} in the prompt template
   */
  processCommand(commandName, args = '') {
    const command = this.getCommand(commandName);
    if (!command) {
      return null;
    }

    // Replace {{args}} with actual arguments
    let prompt = command.prompt;
    prompt = prompt.replace(/\{\{args\}\}/g, args);

    return {
      ...command,
      processedPrompt: prompt,
      originalArgs: args
    };
  }
}

/**
 * Parse custom command invocation (e.g., "/grep-code pattern")
 */
export function parseCustomCommand(input) {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return null;
  }

  const parts = trimmed.substring(1).split(/\s+/);
  const commandName = parts[0];
  const args = parts.slice(1).join(' ');

  return {
    commandName,
    args,
    raw: trimmed
  };
}
