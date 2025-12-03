/**
 * Non-Interactive Mode - Single prompt execution
 */

import chalk from 'chalk';
import { PolzaClient } from './lib/polza-client.js';
import { getTools, getToolHandlers } from './lib/tools.js';
import { renderMarkdown } from './ui/markdown.js';
import { processPrompt } from './utils/prompt-processor.js';

/**
 * Run non-interactive mode with a single prompt
 */
export async function runNonInteractive(prompt, config) {
  try {
    // Initialize Polza client
    const client = new PolzaClient(config.apiKey, config.apiBase);

    // Get tools and handlers
    const tools = getTools(config.yoloMode);
    const toolHandlers = getToolHandlers(config.yoloMode);

    // Process prompt (handle @file and !shell syntax)
    const processedPrompt = await processPrompt(prompt, config.yoloMode);

    // Send to AI with tools
    const response = await client.chatWithTools(processedPrompt, {
      model: config.model,
      tools,
      toolHandlers,
    });

    const assistantMessage = response.choices[0].message.content;

    // Output based on format
    if (config.outputFormat === 'json') {
      console.log(JSON.stringify({
        prompt,
        response: assistantMessage,
        model: config.model,
      }, null, 2));
    } else if (config.outputFormat === 'stream-json') {
      console.log(JSON.stringify({
        type: 'response',
        content: assistantMessage,
      }));
    } else {
      // Text format (default)
      renderMarkdown(assistantMessage);
      console.log();
    }
  } catch (error) {
    if (config.outputFormat === 'json' || config.outputFormat === 'stream-json') {
      console.error(JSON.stringify({
        error: error.message,
      }));
    } else {
      console.error(chalk.red('✗ Error:'), error.message);
    }
    process.exit(1);
  }
}
