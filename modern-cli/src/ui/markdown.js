/**
 * Markdown Renderer - Beautiful terminal markdown
 */

import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to use terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    code: (code) => `\x1b[90m${code}\x1b[0m`,
    blockquote: (quote) => `\x1b[90m│ ${quote}\x1b[0m`,
    heading: (text, level) => {
      const colors = ['\x1b[1;36m', '\x1b[1;35m', '\x1b[1;33m'];
      const color = colors[Math.min(level - 1, 2)];
      return `${color}${text}\x1b[0m\n`;
    },
    strong: (text) => `\x1b[1m${text}\x1b[0m`,
    em: (text) => `\x1b[3m${text}\x1b[0m`,
    codespan: (text) => `\x1b[36m${text}\x1b[0m`,
    list: (body, ordered) => body,
    listitem: (text) => `  • ${text}`,
  }),
});

/**
 * Render markdown to terminal
 */
export function renderMarkdown(text) {
  try {
    const rendered = marked(text);
    console.log(rendered);
  } catch (error) {
    // Fallback to plain text if markdown rendering fails
    console.log(text);
  }
}
