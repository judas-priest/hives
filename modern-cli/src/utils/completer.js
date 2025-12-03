/**
 * Autocomplete and fuzzy search functionality
 */

import fs from 'fs';
import path from 'path';

/**
 * Available slash commands
 */
const SLASH_COMMANDS = [
  '/help',
  '/exit',
  '/quit',
  '/clear',
  '/history',
  '/version',
  '/model',
  '/yolo',
  '/tools',
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
 * Completer function for readline
 */
export function createCompleter(historyGetter) {
  return function completer(line) {
    const trimmedLine = line.trim();

    // Autocomplete slash commands
    if (trimmedLine.startsWith('/')) {
      const hits = SLASH_COMMANDS.filter(cmd => cmd.startsWith(trimmedLine));
      return [hits.length ? hits : SLASH_COMMANDS, trimmedLine];
    }

    // Autocomplete @file references
    if (trimmedLine.includes('@')) {
      const atIndex = trimmedLine.lastIndexOf('@');
      const beforeAt = trimmedLine.substring(0, atIndex + 1);
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

        // Get files in the directory
        const files = getFilesInDirectory(searchPath, 1);

        // Filter with fuzzy matching
        const matches = files
          .filter(f => fuzzyMatch(searchPattern, f))
          .map(f => ({
            file: f,
            score: fuzzyScore(searchPattern, f),
          }))
          .sort((a, b) => b.score - a.score)
          .map(m => beforeAt + m.file);

        return [matches.slice(0, 10), line];
      } catch (error) {
        return [[], line];
      }
    }

    // Fuzzy search history
    if (trimmedLine.length >= 2) {
      const history = historyGetter ? historyGetter() : [];
      const matches = history
        .filter(h => fuzzyMatch(trimmedLine, h))
        .map(h => ({
          text: h,
          score: fuzzyScore(trimmedLine, h),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(m => m.text);

      if (matches.length > 0) {
        return [matches, trimmedLine];
      }
    }

    return [[], line];
  };
}
