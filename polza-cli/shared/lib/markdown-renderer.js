/**
 * Markdown Renderer
 * Renders markdown content for terminal display with proper list handling
 */

import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bgGray: '\x1b[100m'
};

// Configure marked with terminal renderer
// Using custom options to improve list rendering
marked.setOptions({
  renderer: new TerminalRenderer({
    // Code blocks
    code: (code, lang) => {
      const langLabel = lang ? `${colors.cyan}[${lang}]${colors.reset} ` : '';
      return `\n${langLabel}${colors.bgGray}\n${code}\n${colors.reset}\n`;
    },

    // Block quotes
    blockquote: (quote) => {
      return `${colors.dim}│ ${quote.trim()}${colors.reset}\n\n`;
    },

    // Headings
    heading: (text, level) => {
      const levelColors = {
        1: `${colors.bold}${colors.magenta}`,
        2: `${colors.bold}${colors.blue}`,
        3: `${colors.bold}${colors.cyan}`,
        4: colors.bold,
        5: colors.dim,
        6: colors.dim
      };
      const color = levelColors[level] || colors.bold;
      const prefix = level <= 2 ? '\n' : '';
      return `${prefix}${color}${text}${colors.reset}\n\n`;
    },

    // Horizontal rules
    hr: () => {
      return `${colors.dim}${'─'.repeat(60)}${colors.reset}\n\n`;
    },

    // Lists - the key improvement
    list: (body, ordered, start) => {
      return body + '\n';
    },

    listitem: (text, checked) => {
      // Task list items
      if (typeof checked === 'boolean') {
        const checkbox = checked ? `${colors.cyan}[✓]${colors.reset}` : `${colors.dim}[ ]${colors.reset}`;
        return `  ${checkbox} ${text}\n`;
      }
      // Regular list items (bullet points)
      return `  • ${text}\n`;
    },

    // Paragraphs
    paragraph: (text) => {
      return `${text}\n\n`;
    },

    // Tables
    table: (header, body) => {
      return `\n${header}${body}\n`;
    },

    tablerow: (content) => {
      return `${content}\n`;
    },

    tablecell: (content, flags) => {
      return `${content} | `;
    },

    // Inline styles
    strong: (text) => {
      return `${colors.bold}${text}${colors.reset}`;
    },

    em: (text) => {
      return `${colors.italic}${text}${colors.reset}`;
    },

    codespan: (code) => {
      return `${colors.gray}\`${code}\`${colors.reset}`;
    },

    del: (text) => {
      return `${colors.dim}${text}${colors.reset}`;
    },

    // Links
    link: (href, title, text) => {
      return `${colors.blue}${text}${colors.reset} ${colors.dim}(${href})${colors.reset}`;
    },

    // Images
    image: (href, title, text) => {
      return `${colors.cyan}[Image: ${text || 'image'}]${colors.reset} ${colors.dim}(${href})${colors.reset}`;
    },

    // Line breaks
    br: () => {
      return '\n';
    }
  }),
  gfm: true,
  breaks: false,
  pedantic: false
});

/**
 * Render markdown text to terminal-friendly format
 */
export function renderMarkdown(text) {
  try {
    const result = marked.parse(text);
    // Clean up excessive newlines (more than 2) but preserve intentional spacing
    return result.replace(/\n{3,}/g, '\n\n').trimEnd();
  } catch (error) {
    // If markdown parsing fails, return plain text
    console.error('Markdown parsing error:', error.message);
    return text;
  }
}

/**
 * Check if text contains markdown
 */
export function hasMarkdown(text) {
  // Simple heuristics to detect markdown
  const markdownPatterns = [
    /```[\s\S]*?```/,       // Code blocks
    /`[^`\n]+`/,            // Inline code
    /^#{1,6}\s/m,           // Headers
    /\*\*[^*\n]+\*\*/,      // Bold
    /\*[^*\n]+\*/,          // Italic
    /\[[^\]]+\]\([^)]+\)/,  // Links
    /^[\s]*[-*+]\s/m,       // Unordered lists
    /^\d+\.\s/m,            // Ordered lists
    /^\|.+\|$/m,            // Tables
    /^>\s/m                 // Blockquotes
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * Strip markdown formatting (for plain text output)
 */
export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')          // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')             // Remove inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')           // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^#{1,6}\s+/gm, '')             // Remove headers
    .replace(/^[\s]*[-*+]\s+/gm, '• ')       // Simplify unordered lists
    .replace(/^\d+\.\s+/gm, '')              // Remove ordered list numbers
    .replace(/^>\s+/gm, '');                 // Remove blockquotes
}
