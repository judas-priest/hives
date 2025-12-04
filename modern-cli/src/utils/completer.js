/**
 * Autocomplete and fuzzy search functionality with highlighting
 * Uses fuzzysort for high-performance fuzzy matching
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import fuzzysort from 'fuzzysort';

/**
 * Available slash commands
 */
const SLASH_COMMANDS = [
  '/help',
  '/exit',
  '/quit',
  '/clear',
  '/history',
  '/reset',
  '/version',
  '/model',
  '/yolo',
  '/stream',
  '/tools',
  '/save',
  '/load',
  '/sessions',
];

/**
 * Common file extensions for code files
 */
const CODE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx',
  '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.hpp',
  '.html', '.css', '.scss',
  '.json', '.yaml', '.yml',
  '.md', '.txt', '.sh',
];

/**
 * Fuzzy match algorithm
 * Returns true if pattern matches text (case-insensitive, fuzzy)
 */
export function fuzzyMatch(pattern, text) {
  if (!pattern) return true;

  pattern = pattern.toLowerCase();
  text = text.toLowerCase();

  let patternIdx = 0;
  let textIdx = 0;

  while (patternIdx < pattern.length && textIdx < text.length) {
    if (pattern[patternIdx] === text[textIdx]) {
      patternIdx++;
    }
    textIdx++;
  }

  return patternIdx === pattern.length;
}

/**
 * Calculate fuzzy match score (higher is better)
 */
export function fuzzyScore(pattern, text) {
  if (!pattern) return 0;

  pattern = pattern.toLowerCase();
  text = text.toLowerCase();

  let score = 0;
  let patternIdx = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (pattern[patternIdx] === text[i]) {
      // Bonus for consecutive matches
      consecutiveMatches++;
      score += 1 + consecutiveMatches;

      // Bonus for match at word boundary
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '/') {
        score += 5;
      }

      patternIdx++;
    } else {
      consecutiveMatches = 0;
    }
  }

  // Penalty for not matching all characters
  if (patternIdx !== pattern.length) {
    return 0;
  }

  // Bonus for exact match
  if (text === pattern) {
    score += 100;
  }

  // Bonus for prefix match
  if (text.startsWith(pattern)) {
    score += 50;
  }

  return score;
}

/**
 * Highlight matching characters in text based on pattern
 * Returns text with matching chars highlighted (modern style like fzf, VS Code)
 */
export function highlightMatch(pattern, text) {
  if (!pattern) return chalk.dim(text);

  const lowerPattern = pattern.toLowerCase();
  const lowerText = text.toLowerCase();

  let result = '';
  let patternIdx = 0;

  for (let i = 0; i < text.length; i++) {
    if (patternIdx < lowerPattern.length && lowerText[i] === lowerPattern[patternIdx]) {
      // Highlight matching character in bright yellow (stands out more)
      result += chalk.yellow.bold(text[i]);
      patternIdx++;
    } else {
      // Regular character in dim white
      result += chalk.dim(text[i]);
    }
  }

  return result;
}

/**
 * Get files in a directory (for @ completion)
 */
export function getFilesInDirectory(dirPath, maxDepth = 2) {
  const results = [];

  function traverse(currentPath, depth) {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (entry.isDirectory()) {
          results.push(relativePath + '/');
          traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // Only include code files
          const ext = path.extname(entry.name);
          if (CODE_EXTENSIONS.includes(ext)) {
            results.push(relativePath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  traverse(dirPath, 0);
  return results;
}

/**
 * Format completion list with highlighting
 */
export function formatCompletions(pattern, completions, maxDisplay = 10) {
  if (completions.length === 0) return '';

  const displayItems = completions.slice(0, maxDisplay);
  const formatted = displayItems.map(item => highlightMatch(pattern, item)).join('  ');

  return '\n' + formatted + (completions.length > maxDisplay ? chalk.dim(` (+${completions.length - maxDisplay} more)`) : '');
}

/**
 * Completer function for readline with enhanced fuzzy matching
 *
 * IMPORTANT: This function must return PLAIN TEXT completions without ANSI codes.
 * Readline does not handle ANSI escape sequences in completion strings correctly,
 * which causes invisible tab characters and other rendering issues.
 *
 * @param {Function} historyGetter - Function that returns command history array
 * @returns {Function} Completer function for readline
 */
export function createCompleter(historyGetter) {
  return function completer(line) {
    const trimmedLine = line.trim();

    // Autocomplete slash commands
    if (trimmedLine.startsWith('/')) {
      const pattern = trimmedLine.substring(1);

      // Use fuzzysort for high-performance fuzzy matching
      if (pattern.length === 0) {
        // No pattern yet - show all commands
        return [SLASH_COMMANDS, trimmedLine];
      }

      const results = fuzzysort.go(pattern, SLASH_COMMANDS);
      const matches = results.map(r => r.target);

      // If we have matches, return them; otherwise show all commands
      const hits = matches.length > 0 ? matches : SLASH_COMMANDS;

      // Return PLAIN TEXT completions (no ANSI codes!)
      return [hits, trimmedLine];
    }

    // Autocomplete @file references
    if (trimmedLine.includes('@')) {
      const atIndex = trimmedLine.lastIndexOf('@');
      const beforeAt = trimmedLine.substring(0, atIndex);
      const afterAt = trimmedLine.substring(atIndex + 1);

      try {
        // Get current directory or specified path
        let searchPath = '.';
        let searchPattern = afterAt;

        if (afterAt.includes('/')) {
          const lastSlash = afterAt.lastIndexOf('/');
          searchPath = afterAt.substring(0, lastSlash) || '.';
          searchPattern = afterAt.substring(lastSlash + 1);
        }

        // Check if search path exists before proceeding
        if (!fs.existsSync(searchPath)) {
          searchPath = '.';
        }

        // Get files in the directory
        const files = getFilesInDirectory(searchPath, 2);

        // Use fuzzysort if we have a pattern, otherwise show all
        let matches;
        if (searchPattern.length > 0) {
          const results = fuzzysort.go(searchPattern, files);
          matches = results.map(r => beforeAt + '@' + r.target);
        } else {
          matches = files.slice(0, 20).map(f => beforeAt + '@' + f);
        }

        // Return PLAIN TEXT completions (no ANSI codes!)
        return [matches.length > 0 ? matches.slice(0, 20) : [], line];
      } catch (error) {
        // Silently handle errors - just return no completions
        return [[], line];
      }
    }

    // Fuzzy search history
    if (trimmedLine.length >= 2) {
      const history = historyGetter ? historyGetter() : [];

      if (history.length > 0) {
        const results = fuzzysort.go(trimmedLine, history);
        const matches = results.slice(0, 5).map(r => r.target);

        if (matches.length > 0) {
          // Return PLAIN TEXT completions (no ANSI codes!)
          return [matches, trimmedLine];
        }
      }
    }

    return [[], line];
  };
}
