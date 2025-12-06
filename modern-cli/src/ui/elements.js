/**
 * Modern UI Elements - Contour lines and progress bars
 */

import chalk from 'chalk';

/**
 * Unicode box drawing characters for contour lines
 */
const CHARS = {
  // Corners
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',

  // Lines
  horizontal: '─',
  vertical: '│',

  // T-junctions
  tDown: '┬',
  tUp: '┴',
  tRight: '├',
  tLeft: '┤',

  // Progress bar
  filled: '█',
  partial: ['▏', '▎', '▍', '▌', '▋', '▊', '▉'],
  empty: '░',
};

/**
 * Create a horizontal contour line
 * @param {number} length - Length of the line
 * @param {string} color - Chalk color function name
 * @param {boolean} showCorner - Whether to show corner at the start
 * @param {string} cornerType - Type of corner: 'top-left', 'bottom-left', 'none'
 */
export function createContourLine(length = 50, color = 'cyan', showCorner = true, cornerType = 'bottom-left') {
  const chalkFn = chalk[color] || chalk.cyan;
  let line = '';

  if (showCorner) {
    switch (cornerType) {
      case 'top-left':
        line = CHARS.topLeft;
        break;
      case 'bottom-left':
        line = CHARS.bottomLeft;
        break;
      case 'top-right':
        line = CHARS.topRight;
        break;
      case 'bottom-right':
        line = CHARS.bottomRight;
        break;
      default:
        line = CHARS.bottomLeft;
    }
  }

  line += CHARS.horizontal.repeat(length);

  return chalkFn(line);
}

/**
 * Create a modern progress bar in the style of pip
 * @param {number} percentage - Progress percentage (0-100)
 * @param {number} width - Width of the progress bar
 * @param {Object} options - Options for customization
 */
export function createProgressBar(percentage, width = 40, options = {}) {
  const {
    color = 'cyan',
    showPercentage = true,
    showArrow = true,
    emptyChar = CHARS.empty,
    filledChar = CHARS.filled,
  } = options;

  // Ensure percentage is within bounds
  const pct = Math.max(0, Math.min(100, percentage));

  // Calculate how many characters should be filled
  const filledWidth = (pct / 100) * width;
  const fullChars = Math.floor(filledWidth);
  const partialIndex = Math.floor((filledWidth - fullChars) * CHARS.partial.length);

  // Build the bar
  let bar = '';

  // Filled portion
  bar += filledChar.repeat(fullChars);

  // Partial character
  if (fullChars < width && partialIndex > 0) {
    bar += CHARS.partial[partialIndex - 1];
  }

  // Empty portion
  const emptyWidth = width - fullChars - (partialIndex > 0 ? 1 : 0);
  if (emptyWidth > 0) {
    bar += emptyChar.repeat(emptyWidth);
  }

  // Apply color to filled portion
  const chalkFn = chalk[color] || chalk.cyan;
  const coloredBar = chalkFn(bar.substring(0, fullChars + (partialIndex > 0 ? 1 : 0))) +
                     chalk.gray(bar.substring(fullChars + (partialIndex > 0 ? 1 : 0)));

  // Add percentage if requested
  let result = coloredBar;
  if (showPercentage) {
    result += ' ' + chalk.white(`${pct.toFixed(0)}%`);
  }

  return result;
}

/**
 * Create an animated progress bar that updates in place
 * Returns an object with update and finish methods
 */
export function createAnimatedProgressBar(options = {}) {
  const {
    width = 40,
    color = 'cyan',
    text = 'Processing',
    stream = process.stderr,
  } = options;

  let currentPercentage = 0;
  let isFinished = false;

  const render = (pct, customText) => {
    if (isFinished) return;

    const displayText = customText || text;
    const bar = createProgressBar(pct, width, { color, showPercentage: true });
    const line = `${displayText} ${bar}`;

    // Clear line and write new content (only if stream supports it)
    if (typeof stream.clearLine === 'function') {
      stream.clearLine(0);
      stream.cursorTo(0);
      stream.write(line);
    } else {
      // Fallback: write with carriage return
      stream.write('\r' + line);
    }
  };

  return {
    /**
     * Update progress
     * @param {number} percentage - New percentage value
     * @param {string} customText - Optional custom text to display
     */
    update(percentage, customText) {
      currentPercentage = percentage;
      render(percentage, customText);
    },

    /**
     * Finish and clear the progress bar
     */
    finish() {
      if (isFinished) return;
      isFinished = true;
      if (typeof stream.clearLine === 'function') {
        stream.clearLine(0);
        stream.cursorTo(0);
      } else {
        stream.write('\r' + ' '.repeat(80) + '\r');
      }
    },

    /**
     * Finish and keep the progress bar
     * @param {string} finalText - Final text to display
     */
    succeed(finalText) {
      if (isFinished) return;
      isFinished = true;
      const bar = createProgressBar(100, width, { color: 'green', showPercentage: true });
      if (typeof stream.clearLine === 'function') {
        stream.clearLine(0);
        stream.cursorTo(0);
      } else {
        stream.write('\r');
      }
      stream.write(`${finalText || text} ${bar}\n`);
    },

    /**
     * Finish with error state
     * @param {string} errorText - Error text to display
     */
    fail(errorText) {
      if (isFinished) return;
      isFinished = true;
      if (typeof stream.clearLine === 'function') {
        stream.clearLine(0);
        stream.cursorTo(0);
      } else {
        stream.write('\r');
      }
      stream.write(chalk.red(`✗ ${errorText || 'Failed'}\n`));
    },
  };
}

/**
 * Create a box with contour lines
 * @param {string} content - Content to display in the box
 * @param {Object} options - Box options
 */
export function createContourBox(content, options = {}) {
  const {
    width = 50,
    color = 'cyan',
    padding = 1,
    title = null,
  } = options;

  const chalkFn = chalk[color] || chalk.cyan;
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length), title ? title.length : 0);
  const boxWidth = Math.max(width, maxLength + (padding * 2));

  let result = '';

  // Top border
  if (title) {
    const titlePadding = Math.floor((boxWidth - title.length - 2) / 2);
    result += chalkFn(CHARS.topLeft + CHARS.horizontal.repeat(titlePadding));
    result += ' ' + chalk.bold(title) + ' ';
    result += chalkFn(CHARS.horizontal.repeat(boxWidth - titlePadding - title.length - 2) + CHARS.topRight);
  } else {
    result += chalkFn(CHARS.topLeft + CHARS.horizontal.repeat(boxWidth) + CHARS.topRight);
  }
  result += '\n';

  // Content
  for (const line of lines) {
    result += chalkFn(CHARS.vertical);
    result += ' '.repeat(padding) + line + ' '.repeat(boxWidth - line.length - padding);
    result += chalkFn(CHARS.vertical);
    result += '\n';
  }

  // Bottom border
  result += chalkFn(CHARS.bottomLeft + CHARS.horizontal.repeat(boxWidth) + CHARS.bottomRight);

  return result;
}

/**
 * Create a separator line with text in the middle
 * @param {string} text - Text to display in the middle
 * @param {number} width - Total width of the separator
 * @param {string} color - Color for the separator
 */
export function createSeparator(text = '', width = 50, color = 'gray') {
  const chalkFn = chalk[color] || chalk.gray;

  if (!text) {
    return chalkFn(CHARS.horizontal.repeat(width));
  }

  const textLength = text.length + 2; // +2 for spaces around text
  const lineLength = Math.floor((width - textLength) / 2);

  return chalkFn(CHARS.horizontal.repeat(lineLength)) +
         ' ' + text + ' ' +
         chalkFn(CHARS.horizontal.repeat(width - lineLength - textLength));
}

/**
 * Create a spinner-style progress indicator
 * Returns an array of frames for animation
 */
export function getSpinnerFrames() {
  return [
    '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'
  ];
}

/**
 * Create a modern divider with contour lines
 */
export function createDivider(color = 'gray') {
  return createContourLine(50, color, true, 'bottom-left');
}

// Export characters for direct use
export { CHARS };
