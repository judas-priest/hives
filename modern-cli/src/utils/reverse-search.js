/**
 * Reverse search functionality (like Ctrl+R in bash)
 */

import chalk from 'chalk';
import { fuzzyMatch, fuzzyScore } from './completer.js';

/**
 * Interactive reverse search through history
 */
export async function reverseSearch(rl, history) {
  return new Promise((resolve) => {
    let searchPattern = '';
    let searchResults = [];
    let currentIndex = 0;

    // Save the current prompt
    const originalPrompt = rl.getPrompt();

    // Function to update display
    const updateDisplay = () => {
      // Clear the current line
      rl.write('', { ctrl: true, name: 'u' });

      if (!searchPattern) {
        rl.setPrompt(chalk.cyan('(reverse-search): '));
        rl.prompt();
        return;
      }

      // Search history with fuzzy matching
      searchResults = history
        .map((cmd, idx) => ({
          cmd,
          idx,
          score: fuzzyScore(searchPattern, cmd),
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

      if (searchResults.length === 0) {
        rl.setPrompt(chalk.red(`(failed reverse-search)\`${searchPattern}': `));
        rl.prompt();
      } else {
        const result = searchResults[currentIndex % searchResults.length];
        rl.setPrompt(
          chalk.cyan(`(reverse-search)\`${searchPattern}': `) +
          chalk.gray(result.cmd)
        );
        rl.prompt();
      }
    };

    // Set up key listeners
    const onKeypress = (char, key) => {
      if (!key) return;

      // Ctrl+R - cycle through results
      if (key.ctrl && key.name === 'r') {
        if (searchResults.length > 0) {
          currentIndex = (currentIndex + 1) % searchResults.length;
          updateDisplay();
        }
        return;
      }

      // Ctrl+C or Ctrl+G - cancel
      if ((key.ctrl && key.name === 'c') || (key.ctrl && key.name === 'g')) {
        cleanup();
        rl.setPrompt(originalPrompt);
        rl.prompt();
        resolve(null);
        return;
      }

      // Enter - accept current result
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        rl.setPrompt(originalPrompt);
        if (searchResults.length > 0) {
          const result = searchResults[currentIndex % searchResults.length];
          resolve(result.cmd);
        } else {
          resolve(null);
        }
        return;
      }

      // Backspace
      if (key.name === 'backspace') {
        if (searchPattern.length > 0) {
          searchPattern = searchPattern.slice(0, -1);
          currentIndex = 0;
          updateDisplay();
        }
        return;
      }

      // Regular character
      if (char && !key.ctrl && !key.meta && char.length === 1) {
        searchPattern += char;
        currentIndex = 0;
        updateDisplay();
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
    };

    // Start listening
    process.stdin.on('keypress', onKeypress);

    // Initial display
    updateDisplay();
  });
}
