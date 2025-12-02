/**
 * Autocomplete Module (Enhanced)
 * Provides tab completion for commands, files, and directories
 * Features:
 * - Fuzzy matching for commands and files
 * - Inline suggestions (like zsh-autosuggestions)
 * - Enhanced visual preview with colors and icons
 * - Smart command history integration
 */

import fs from 'fs/promises';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import glob from 'fast-glob';

// ANSI color codes for enhanced preview
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

/**
 * Available slash commands
 */
const SLASH_COMMANDS = [
  '/help',
  '/version',
  '/tools',
  '/memory',
  '/settings',
  '/restore',
  '/clear',
  '/history',
  '/sessions',
  '/save',
  '/load',
  '/markdown',
  '/yolo',
  '/init',
  '/exit'
];

/**
 * Memory subcommands
 */
const MEMORY_SUBCOMMANDS = ['set', 'add', 'get', 'list', 'search', 'delete', 'remove', 'clear', 'show', 'refresh', 'reload'];

/**
 * Settings subcommands
 */
const SETTINGS_SUBCOMMANDS = ['set', 'get', 'reset', 'path'];

/**
 * Command history for inline suggestions
 */
let commandHistory = [];

/**
 * Set command history for autocomplete suggestions
 * @param {Array<string>} history - Command history array
 */
export function setCommandHistory(history) {
  commandHistory = history || [];
}

/**
 * Calculate fuzzy match score
 * Higher score = better match
 * @param {string} pattern - The search pattern
 * @param {string} text - The text to match against
 * @returns {number} Match score (0 = no match, higher = better match)
 */
function fuzzyScore(pattern, text) {
  pattern = pattern.toLowerCase();
  text = text.toLowerCase();

  // Exact match gets highest score
  if (text === pattern) return 1000;

  // Starts with pattern gets high score
  if (text.startsWith(pattern)) return 500 + pattern.length;

  // Contains pattern gets medium score
  if (text.includes(pattern)) return 250 + pattern.length;

  // Fuzzy character-by-character matching
  let score = 0;
  let patternIdx = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      score += 1 + consecutiveMatches * 2; // Bonus for consecutive matches
      consecutiveMatches++;
      patternIdx++;
    } else {
      consecutiveMatches = 0;
    }
  }

  // Return score only if all pattern characters were matched
  return patternIdx === pattern.length ? score : 0;
}

/**
 * Get inline suggestion based on command history
 * @param {string} currentLine - Current input line
 * @returns {string|null} Suggested completion or null
 */
export function getInlineSuggestion(currentLine) {
  if (!currentLine || currentLine.length < 2) return null;

  // Find best match from history
  let bestMatch = null;
  let bestScore = 0;

  for (const historyItem of commandHistory) {
    if (historyItem.startsWith(currentLine) && historyItem !== currentLine) {
      const score = fuzzyScore(currentLine, historyItem);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = historyItem;
      }
    }
  }

  if (bestMatch) {
    return bestMatch.substring(currentLine.length);
  }

  return null;
}

/**
 * Create autocomplete function for readline with fuzzy matching
 * @param {Array<string>} customCommands - List of custom command names
 * @returns {Function} Completer function for readline
 */
export function createCompleter(customCommands = []) {
  // Combine all available commands
  const allCommands = [...SLASH_COMMANDS, ...customCommands.map(cmd => `/${cmd}`)];

  return function completer(line) {
    const trimmedLine = line.trim();

    // Handle @ file completion
    if (trimmedLine.includes('@')) {
      return handleFileCompletion(trimmedLine);
    }

    // Handle slash command completion with fuzzy matching
    if (trimmedLine.startsWith('/')) {
      return handleCommandCompletionFuzzy(trimmedLine, allCommands);
    }

    // No completion available
    return [[], line];
  };
}

/**
 * Handle command completion with fuzzy matching
 * @param {string} line - Current input line
 * @param {Array<string>} allCommands - All available commands
 * @returns {Array} [completions, partial]
 */
function handleCommandCompletionFuzzy(line, allCommands) {
  const parts = line.split(/\s+/);
  const command = parts[0];

  // Completing command itself
  if (parts.length === 1 && !line.endsWith(' ')) {
    // Use fuzzy matching to find commands
    const scoredCommands = allCommands.map(cmd => ({
      cmd,
      score: fuzzyScore(command, cmd)
    }));

    // Filter and sort by score
    const hits = scoredCommands
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);

    return [hits.length > 0 ? hits : allCommands, command];
  }

  // Completing subcommands
  if (line.startsWith('/memory ') && parts.length <= 2 && !line.endsWith(' ')) {
    const partial = parts[1] || '';
    const hits = MEMORY_SUBCOMMANDS.filter(sub => fuzzyScore(partial, sub) > 0)
      .sort((a, b) => fuzzyScore(partial, b) - fuzzyScore(partial, a));
    return [hits.length > 0 ? hits : MEMORY_SUBCOMMANDS, partial];
  }

  if (line.startsWith('/settings ') && parts.length <= 2 && !line.endsWith(' ')) {
    const partial = parts[1] || '';
    const hits = SETTINGS_SUBCOMMANDS.filter(sub => fuzzyScore(partial, sub) > 0)
      .sort((a, b) => fuzzyScore(partial, b) - fuzzyScore(partial, a));
    return [hits.length > 0 ? hits : SETTINGS_SUBCOMMANDS, partial];
  }

  // Fallback to original completion
  return handleCommandCompletion(line, allCommands);
}

/**
 * Show interactive preview for @ file references
 * This provides real-time feedback like zsh
 */
export function showFilePreview(line, rl) {
  if (!line.includes('@')) {
    return;
  }

  const lastAtIndex = line.lastIndexOf('@');
  const afterAt = line.substring(lastAtIndex + 1);
  
  // Only show preview if user is actively typing a path (not just @)
  if (afterAt.length === 0) {
    return;
  }

  const isQuoted = afterAt.startsWith('"') || afterAt.startsWith("'");
  const partialPath = isQuoted ? afterAt.substring(1) : afterAt;

  try {
    const completions = findFileCompletions(partialPath);
    
    if (completions.length > 0) {
      // Clear current line and show preview
      rl.write(`\n${formatFilePreview(completions, partialPath)}\n`);
      rl.write(`${line}`);
    }
  } catch (error) {
    // Silent fail for preview
  }
}

/**
 * Show interactive preview for / commands
 * This provides real-time feedback like zsh
 */
export function showCommandPreview(line, rl) {
  if (!line.startsWith('/')) {
    return;
  }

  const parts = line.split(/\s+/);
  const command = parts[0];

  // Only show preview if user is typing a command (not arguments)
  if (parts.length > 1 && line.endsWith(' ')) {
    return; // Don't show preview for arguments
  }

  const commands = getAvailableCommands();
  const matches = commands.filter(cmd => cmd.startsWith(command));

  // Only show preview if there are matches and user isn't just typing "/"
  if (matches.length > 0 && command.length > 1) {
    // Clear current line and show preview
    rl.write(`\n${formatCommandPreview(matches, command)}\n`);
    rl.write(`${line}`);
  }
}

/**
 * Format file preview output with enhanced colors and icons
 */
function formatFilePreview(files, partialPath) {
  const maxFiles = 8;
  const displayFiles = files.slice(0, maxFiles);

  let output = `${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`;
  output += `${colors.bright}${colors.yellow}📁 Files matching "${colors.green}${partialPath}${colors.yellow}":${colors.reset}\n`;
  output += `${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`;

  displayFiles.forEach((file, index) => {
    const isDir = file.endsWith('/');
    const icon = isDir ? '📁' : getFileIcon(file);
    const color = isDir ? colors.blue : colors.reset;
    const prefix = index === 0 ? colors.bright + '➤' : ' ';
    output += `${prefix} ${icon} ${color}${file}${colors.reset}\n`;
  });

  if (files.length > maxFiles) {
    output += `${colors.dim}  ... and ${files.length - maxFiles} more${colors.reset}\n`;
  }

  output += `${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`;
  output += `${colors.gray}💡 Press ${colors.bright}TAB${colors.reset}${colors.gray} to autocomplete | ${colors.bright}Ctrl+C${colors.reset}${colors.gray} to cancel${colors.reset}`;

  return output;
}

/**
 * Get appropriate icon for file based on extension
 */
function getFileIcon(filename) {
  const ext = path.extname(filename).toLowerCase();
  const icons = {
    '.js': '📜',
    '.mjs': '📜',
    '.ts': '📘',
    '.json': '📋',
    '.md': '📝',
    '.txt': '📄',
    '.log': '📊',
    '.py': '🐍',
    '.sh': '⚡',
    '.yml': '⚙️',
    '.yaml': '⚙️',
    '.toml': '⚙️',
    '.env': '🔐',
    '.git': '🔀',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.svg': '🎨',
    '.pdf': '📕',
    '.zip': '📦',
    '.tar': '📦',
    '.gz': '📦'
  };
  return icons[ext] || '📄';
}

/**
 * Format command preview output with enhanced colors and formatting
 */
function formatCommandPreview(commands, partial) {
  let output = `${colors.cyan}${'─'.repeat(70)}${colors.reset}\n`;
  output += `${colors.bright}${colors.yellow}⚡ Commands matching "${colors.green}${partial}${colors.yellow}":${colors.reset}\n`;
  output += `${colors.cyan}${'─'.repeat(70)}${colors.reset}\n`;

  commands.forEach((cmd, index) => {
    const description = getCommandDescription(cmd);
    const prefix = index === 0 ? colors.bright + '➤' : ' ';

    // Highlight the matching part of the command
    const highlightedCmd = highlightMatch(cmd, partial);

    output += `${prefix} ${colors.bright}${colors.cyan}${highlightedCmd.padEnd(20)}${colors.reset} ${colors.dim}${description}${colors.reset}\n`;
  });

  output += `${colors.cyan}${'─'.repeat(70)}${colors.reset}\n`;
  output += `${colors.gray}💡 Press ${colors.bright}TAB${colors.reset}${colors.gray} to autocomplete | ${colors.bright}Ctrl+C${colors.reset}${colors.gray} to cancel${colors.reset}`;

  return output;
}

/**
 * Highlight matching characters in a command
 */
function highlightMatch(text, pattern) {
  if (!pattern || pattern.length === 0) return text;

  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  // Find start of match
  const matchIndex = lowerText.indexOf(lowerPattern);

  if (matchIndex === -1) return text;

  const before = text.substring(0, matchIndex);
  const match = text.substring(matchIndex, matchIndex + pattern.length);
  const after = text.substring(matchIndex + pattern.length);

  return `${before}${colors.green}${colors.bright}${match}${colors.reset}${colors.cyan}${after}`;
}

/**
 * Get command descriptions
 */
function getCommandDescription(command) {
  const descriptions = {
    '/help': 'Show available commands',
    '/version': 'Show version information',
    '/tools': 'List available tools',
    '/memory': 'Manage persistent memory',
    '/settings': 'View/modify settings',
    '/restore': 'Restore a saved session',
    '/clear': 'Clear conversation history',
    '/history': 'Show conversation history',
    '/sessions': 'List saved sessions',
    '/save': 'Save current session',
    '/load': 'Load a saved session',
    '/markdown': 'Toggle markdown rendering',
    '/yolo': 'Toggle YOLO mode (shell execution)',
    '/init': 'Create a POLZA.md file',
    '/exit': 'Exit the CLI'
  };

  return descriptions[command] || 'Custom command';
}

/**
 * Get all available commands
 */
function getAvailableCommands() {
  return [
    '/help', '/version', '/tools', '/memory', '/settings', '/restore', '/clear',
    '/history', '/sessions', '/save', '/load', '/markdown', '/yolo', '/init', '/exit'
  ];
}

/**
 * Handle completion for slash commands
 */
function handleCommandCompletion(line, allCommands) {
  const parts = line.split(/\s+/);
  const command = parts[0];

  // Completing command itself
  if (parts.length === 1 && !line.endsWith(' ')) {
    const hits = allCommands.filter(cmd => cmd.startsWith(command));
    return [hits.length > 0 ? hits : allCommands, command];
  }

  // Completing subcommands
  if (line.startsWith('/memory ') && parts.length <= 2 && !line.endsWith(' ')) {
    const partial = parts[1] || '';
    const hits = MEMORY_SUBCOMMANDS.filter(sub => sub.startsWith(partial));
    return [hits, partial];
  }

  if (line.startsWith('/settings ') && parts.length <= 2 && !line.endsWith(' ')) {
    const partial = parts[1] || '';
    const hits = SETTINGS_SUBCOMMANDS.filter(sub => sub.startsWith(partial));
    return [hits, partial];
  }

  // No subcommand completion for this command
  return [[], line];
}

/**
 * Handle completion for @ file references
 */
function handleFileCompletion(line) {
  // Find the last @ in the line
  const lastAtIndex = line.lastIndexOf('@');
  if (lastAtIndex === -1) {
    return [[], line];
  }

  // Extract the partial path after @
  const afterAt = line.substring(lastAtIndex + 1);

  // Check if path is quoted
  const isQuoted = afterAt.startsWith('"') || afterAt.startsWith("'");
  const quote = isQuoted ? afterAt[0] : '';
  const partialPath = isQuoted ? afterAt.substring(1) : afterAt;

  // Split to get only the file path (stop at space, comma, etc. if not quoted)
  const pathEndMatch = isQuoted
    ? partialPath.match(/^([^"']*)/)[1]
    : partialPath.match(/^([^\s,;!?()[\]{}]*)/)[1];

  const searchPath = pathEndMatch || '';

  try {
    const completions = findFileCompletions(searchPath);

    // Format completions with quotes if needed
    const formattedCompletions = completions.map(comp => {
      const needsQuotes = comp.includes(' ');
      if (needsQuotes && !isQuoted) {
        return `"${comp}"`;
      }
      return comp;
    });

    return [formattedCompletions, searchPath];
  } catch (error) {
    return [[], searchPath];
  }
}

/**
 * Find file/directory completions for a partial path
 */
function findFileCompletions(partialPath) {
  const cwd = process.cwd();

  // Parse the partial path
  const isAbsolute = path.isAbsolute(partialPath);
  const basePath = isAbsolute ? '' : cwd;
  const fullPath = isAbsolute ? partialPath : path.join(cwd, partialPath);

  // Get directory to search in
  const dirPath = path.dirname(fullPath);
  const searchName = path.basename(fullPath);

  try {
    // Check if directory exists
    if (!existsSync(dirPath)) {
      // Try fuzzy file search (simplified for sync)
      return fuzzyFileSearch(searchName, cwd);
    }

    // Read directory contents
    const entries = readdirSync(dirPath);

    // Filter and format entries
    const matches = entries
      .filter(entry => {
        // Skip hidden files unless explicitly typed
        if (entry.startsWith('.') && !searchName.startsWith('.')) {
          return false;
        }
        // Skip node_modules and .git
        if (entry === 'node_modules' || entry === '.git') {
          return false;
        }
        // Match the search pattern
        return entry.toLowerCase().startsWith(searchName.toLowerCase());
      })
      .map(entry => {
        const fullEntryPath = path.join(dirPath, entry);
        const stats = statSync(fullEntryPath);

        // Build relative path
        let relativePath;
        if (isAbsolute) {
          relativePath = fullEntryPath;
        } else {
          relativePath = path.relative(cwd, fullEntryPath);
        }

        // Add trailing slash for directories
        return stats.isDirectory() ? relativePath + '/' : relativePath;
      })
      .slice(0, 50); // Limit to 50 suggestions

    return matches;
  } catch (error) {
    // Fallback to fuzzy search (simplified for sync)
    return fuzzyFileSearch(searchName, cwd);
  }
}

/**
 * Fuzzy file search using glob (simplified sync version)
 */
function fuzzyFileSearch(searchName, cwd) {
  if (!searchName || searchName.length < 2) {
    return [];
  }

  try {
    // Simple fallback: just return basic files from current directory
    const entries = readdirSync(cwd, { withFileTypes: true });
    
    return entries
      .filter(entry => {
        // Skip hidden files unless explicitly typed
        if (entry.name.startsWith('.') && !searchName.startsWith('.')) {
          return false;
        }
        // Skip node_modules and .git
        if (entry.name === 'node_modules' || entry.name === '.git') {
          return false;
        }
        // Match the search pattern
        return entry.name.toLowerCase().includes(searchName.toLowerCase());
      })
      .slice(0, 20) // Limit results
      .map(entry => {
        return entry.isDirectory() ? entry.name + '/' : entry.name;
      });
  } catch (error) {
    return [];
  }
}

/**
 * Update completer with new custom commands
 */
export function updateCompleter(rl, customCommands) {
  if (rl && rl.completer) {
    rl.completer = createCompleter(customCommands);
  }
}
