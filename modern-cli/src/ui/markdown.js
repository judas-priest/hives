/**
 * Markdown Renderer - Beautiful terminal markdown with custom renderer
 * Using marked v15 token-based renderer API
 */

import { marked } from 'marked';
import chalk from 'chalk';

// Create custom renderer that handles marked v15 token objects
marked.use({
  mangle: false,
  headerIds: false,
  breaks: true,
  renderer: {
    code(token) {
      const code = token.text;
      return '\n' + chalk.gray(code.split('\n').map(line => `  ${line}`).join('\n')) + '\n\n';
    },

    blockquote(token) {
      const text = this.parser.parse(token.tokens);
      return '\n' + chalk.gray('│ ' + text.replace(/\n/g, '\n│ ')) + '\n';
    },

    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      const level = token.depth;
      const colors = [chalk.bold.cyan, chalk.bold.magenta, chalk.bold.yellow];
      const colorFn = colors[Math.min(level - 1, 2)] || chalk.bold;
      return '\n' + colorFn(text) + '\n';
    },

    hr(token) {
      return '\n' + chalk.gray('─'.repeat(40)) + '\n';
    },

    list(token) {
      let output = '\n';
      // Render each list item manually
      for (const item of token.items) {
        const bullet = chalk.cyan('•');
        // Parse inline content only to avoid nested formatting
        const itemText = this.parser.parseInline(item.tokens).trim();
        // Remove any leading/trailing whitespace and newlines
        const cleanText = itemText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        output += `  ${bullet} ${cleanText}\n`;
      }
      return output + '\n';
    },

    paragraph(token) {
      const text = this.parser.parseInline(token.tokens);
      return text + '\n\n';
    },

    strong(token) {
      const text = this.parser.parseInline(token.tokens);
      return chalk.bold(text);
    },

    em(token) {
      const text = this.parser.parseInline(token.tokens);
      return chalk.italic(text);
    },

    codespan(token) {
      return chalk.cyan(token.text);
    },

    br(token) {
      return '\n';
    },

    del(token) {
      const text = this.parser.parseInline(token.tokens);
      return chalk.strikethrough(text);
    },

    link(token) {
      const text = this.parser.parseInline(token.tokens);
      return chalk.blue.underline(text || token.href);
    },

    image(token) {
      return chalk.blue(`[Image: ${token.text || token.href}]`);
    },

    text(token) {
      return token.text;
    },

    space(token) {
      return '';
    }
  }
});

/**
 * Render markdown to terminal with clean formatting
 */
export function renderMarkdown(text) {
  try {
    // Parse and render markdown
    const rendered = marked.parse(text);
    // Clean up excessive newlines
    const cleaned = rendered.replace(/\n{3,}/g, '\n\n').trim();
    console.log(cleaned);
  } catch (error) {
    // Fallback to plain text if markdown rendering fails
    console.error('Markdown rendering error:', error.message);
    console.log(text);
  }
}
