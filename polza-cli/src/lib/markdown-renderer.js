/**
 * Markdown Renderer
 * Renders markdown content for terminal display
 */

import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked to use terminal renderer
marked.use(markedTerminal({
  // Customize terminal output styling
  code: (code) => {
    return `\x1b[90m${code}\x1b[0m`; // dim gray for inline code
  },
  blockcode: (code, lang) => {
    const langLabel = lang ? `\x1b[36m[${lang}]\x1b[0m ` : '';
    return `\n${langLabel}\x1b[100m\n${code}\n\x1b[0m\n`;
  },
  heading: (text, level) => {
    const colors = {
      1: '\x1b[1m\x1b[35m', // bold magenta
      2: '\x1b[1m\x1b[34m', // bold blue
      3: '\x1b[1m\x1b[36m', // bold cyan
      4: '\x1b[1m',          // bold
      5: '\x1b[2m',          // dim
      6: '\x1b[2m'           // dim
    };
    const color = colors[level] || colors[4];
    return `${color}${text}\x1b[0m\n`;
  },
  list: (body, ordered) => {
    return `${body}\n`;
  },
  listitem: (text) => {
    return `  • ${text}\n`;
  },
  paragraph: (text) => {
    return `${text}\n\n`;
  },
  strong: (text) => {
    return `\x1b[1m${text}\x1b[0m`; // bold
  },
  em: (text) => {
    return `\x1b[3m${text}\x1b[0m`; // italic
  },
  codespan: (code) => {
    return `\x1b[90m\`${code}\`\x1b[0m`; // dim gray
  },
  link: (href, title, text) => {
    return `\x1b[34m${text}\x1b[0m \x1b[2m(${href})\x1b[0m`;
  },
  hr: () => {
    return '\x1b[2m' + '─'.repeat(60) + '\x1b[0m\n';
  },
  table: (header, body) => {
    return `\n${header}${body}\n`;
  },
  tablerow: (content) => {
    return `${content}\n`;
  },
  tablecell: (content, flags) => {
    return `${content} | `;
  }
}));

/**
 * Render markdown text to terminal-friendly format
 */
export function renderMarkdown(text) {
  try {
    return marked(text);
  } catch (error) {
    // If markdown parsing fails, return plain text
    return text;
  }
}

/**
 * Check if text contains markdown
 */
export function hasMarkdown(text) {
  // Simple heuristics to detect markdown
  const markdownPatterns = [
    /```[\s\S]*?```/,  // Code blocks
    /`[^`]+`/,          // Inline code
    /^#{1,6}\s/m,       // Headers
    /\*\*[^*]+\*\*/,    // Bold
    /\*[^*]+\*/,        // Italic
    /\[[^\]]+\]\([^)]+\)/, // Links
    /^[\s]*[-*+]\s/m,   // Unordered lists
    /^\d+\.\s/m         // Ordered lists
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
}

/**
 * Strip markdown formatting (for plain text output)
 */
export function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')    // Remove inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')  // Remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/^#{1,6}\s+/gm, '')    // Remove headers
    .replace(/^[\s]*[-*+]\s+/gm, '• '); // Simplify lists
}
