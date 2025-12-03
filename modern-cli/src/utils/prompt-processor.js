/**
 * Prompt Processor - Handle @file, @image and !shell syntax
 * Inspired by polza-cli and gemini-cli
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';

// Image file extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];

/**
 * Check if file is an image
 */
function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.some(ext => filePath.toLowerCase().endsWith(ext));
}

/**
 * Convert image file to base64 data URL
 */
function imageToDataURL(filePath) {
  const buffer = readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = filePath.toLowerCase().split('.').pop();
  const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Process prompt to expand @file and !shell syntax
 * Returns { text, images } for multimodal support
 */
export async function processPrompt(prompt, yoloMode = false) {
  let processed = prompt;
  const images = [];

  // Process @file references (including images)
  const result = await processFileIncludes(processed);
  processed = result.text;
  images.push(...result.images);

  // Process !shell commands (only if YOLO mode)
  if (yoloMode) {
    processed = await processShellCommands(processed);
  }

  return { text: processed, images };
}

/**
 * Process @file syntax to include file contents or images
 */
async function processFileIncludes(prompt) {
  // Match @file.ext or @"path with spaces" or @./relative/path
  const fileRegex = /@(?:"([^"]+)"|(\S+))/g;
  let processed = prompt;
  const images = [];

  const matches = [...prompt.matchAll(fileRegex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const filePath = match[1] || match[2];

    try {
      const stats = statSync(filePath);

      if (stats.isFile()) {
        // Check if it's an image
        if (isImageFile(filePath)) {
          // Convert image to data URL
          const dataURL = imageToDataURL(filePath);
          images.push(dataURL);
          const replacement = `[Image: ${filePath}]`;
          processed = processed.replace(fullMatch, replacement);
          console.log(chalk.cyan(`📷 Including image: ${filePath}`));
        } else {
          // Read text file
          const content = readFileSync(filePath, 'utf-8');
          const replacement = `\n<file path="${filePath}">\n${content}\n</file>\n`;
          processed = processed.replace(fullMatch, replacement);
        }
      } else if (stats.isDirectory()) {
        // List directory
        const entries = readdirSync(filePath);
        const listing = entries.join('\n');
        const replacement = `\n<directory path="${filePath}">\n${listing}\n</directory>\n`;
        processed = processed.replace(fullMatch, replacement);
      }
    } catch (error) {
      // File not found - leave the reference as is
      console.warn(chalk.yellow(`⚠️  File not found: ${filePath}`));
    }
  }

  return { text: processed, images };
}

/**
 * Process !command syntax to execute shell commands
 */
async function processShellCommands(prompt) {
  // Match !command or !{command}
  const shellRegex = /!(?:\{([^}]+)\}|(\S+(?:\s+\S+)*))/g;
  let processed = prompt;

  const matches = [...prompt.matchAll(shellRegex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const command = match[1] || match[2];

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024, // 1MB
        timeout: 10000, // 10 seconds
      });
      const replacement = `\n<shell-output command="${command}">\n${output}\n</shell-output>\n`;
      processed = processed.replace(fullMatch, replacement);
    } catch (error) {
      const errorMsg = error.message || 'Command failed';
      console.error(chalk.red(`✗ Shell command failed: ${command}`));
      console.error(chalk.gray(errorMsg));
      const replacement = `\n<shell-error command="${command}">\n${errorMsg}\n</shell-error>\n`;
      processed = processed.replace(fullMatch, replacement);
    }
  }

  return processed;
}
