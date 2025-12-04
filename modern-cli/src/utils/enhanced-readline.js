/**
 * Enhanced readline interface
 *
 * This is a simple wrapper around node:readline that provides a clean interface
 * for creating readline instances with proper configuration.
 *
 * IMPORTANT: Do NOT add ANSI color codes to completion results.
 * Readline does not handle ANSI escape sequences properly and will cause:
 * - Invisible tab characters
 * - Broken cursor positioning
 * - Completion list rendering issues
 *
 * The completer function should return plain text completions only.
 */

import readline from 'node:readline';

/**
 * Create readline interface with proper error handling
 *
 * @param {Object} options - Readline options
 * @param {ReadableStream} options.input - Input stream
 * @param {WritableStream} options.output - Output stream
 * @param {Function} options.completer - Completer function (must return plain text!)
 * @param {boolean} options.terminal - Whether streams should be treated as TTY
 * @returns {readline.Interface} Readline interface
 */
export function createEnhancedReadline(options) {
  // Wrap the completer for error handling
  const originalCompleter = options.completer;

  if (originalCompleter) {
    options.completer = function safeCompleter(line) {
      try {
        const result = originalCompleter(line);

        // Ensure result is in correct format [completions[], originalLine]
        if (!result || !Array.isArray(result)) {
          return [[], line];
        }

        return result;
      } catch (error) {
        // Fail gracefully - don't crash on completer errors
        console.error('Completer error:', error.message);
        return [[], line];
      }
    };
  }

  // Create the readline interface
  const rl = readline.createInterface(options);

  return rl;
}
