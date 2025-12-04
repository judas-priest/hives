/**
 * Enhanced readline with visual fuzzy completion highlighting
 */

import readline from 'node:readline';
import chalk from 'chalk';
import { highlightMatch } from './completer.js';

/**
 * Create enhanced readline interface with visual autocomplete
 *
 * This wrapper adds visual highlighting to Tab completion results while
 * avoiding interference with readline's internal state.
 */
export function createEnhancedReadline(options) {
  const originalCompleter = options.completer;

  // Wrap the completer to add visual highlighting
  if (originalCompleter) {
    options.completer = function enhancedCompleter(line) {
      try {
        // Call the original completer (synchronous)
        const result = originalCompleter(line);

        // Safely handle null or undefined results
        if (!result || !Array.isArray(result)) {
          return [[], line];
        }

        const [completions, originalLine] = result;

        // If we have multiple completions, add highlighting
        if (completions && completions.length > 1) {
          // Extract the search pattern for highlighting
          let searchPattern = originalLine || '';

          if (searchPattern.startsWith('/')) {
            searchPattern = searchPattern.substring(1);
          } else if (searchPattern.includes('@')) {
            const atIndex = searchPattern.lastIndexOf('@');
            searchPattern = searchPattern.substring(atIndex + 1);
          }

          // Create highlighted versions of completions
          const highlightedCompletions = completions.map(item => {
            try {
              // For commands, highlight the matching part
              if (item.startsWith('/')) {
                const itemWithoutSlash = item.substring(1);
                return '/' + highlightMatch(searchPattern, itemWithoutSlash);
              } else if (item.includes('@')) {
                const atIndex = item.lastIndexOf('@');
                const beforeAt = item.substring(0, atIndex + 1);
                const afterAt = item.substring(atIndex + 1);
                return beforeAt + highlightMatch(searchPattern, afterAt);
              } else {
                return highlightMatch(searchPattern, item);
              }
            } catch (err) {
              // If highlighting fails, return item as-is
              return item;
            }
          });

          // Return highlighted completions for readline to display
          return [highlightedCompletions, originalLine];
        }

        // For single or no completions, return as-is
        return result;
      } catch (error) {
        // Fail gracefully - just return empty completions
        // Don't let completer errors crash the application
        return [[], line];
      }
    };
  }

  // Create the readline interface
  const rl = readline.createInterface(options);

  return rl;
}
