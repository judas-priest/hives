/**
 * Prompt Processor
 * Handles @file inclusion and !shell execution in prompts
 */

import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import glob from 'fast-glob';

const execAsync = promisify(exec);

/**
 * Process a prompt with @file and !{shell} syntax
 * @param {string} prompt - The prompt to process
 * @param {boolean} yolomode - Whether YOLO mode is enabled (auto-approve shell commands)
 * @returns {Promise<{prompt: string, metadata: object}>}
 */
export async function processPrompt(prompt, yolomode = false) {
  let processed = prompt;
  const metadata = {
    filesIncluded: [],
    shellCommands: [],
    errors: []
  };

  try {
    // Step 1: Process @file inclusions
    const fileResult = await processFileInclusions(processed);
    processed = fileResult.prompt;
    metadata.filesIncluded = fileResult.filesIncluded;
    metadata.errors.push(...fileResult.errors);

    // Step 2: Process !{shell} commands
    if (yolomode) {
      const shellResult = await processShellCommands(processed);
      processed = shellResult.prompt;
      metadata.shellCommands = shellResult.commands;
      metadata.errors.push(...shellResult.errors);
    } else {
      // Check if there are shell commands but yolo mode is off
      if (processed.includes('!{')) {
        metadata.errors.push({
          type: 'shell_disabled',
          message: 'Shell commands (!{...}) detected but YOLO mode is not enabled. Use --yolomode flag to enable shell execution.'
        });
      }
    }
  } catch (error) {
    metadata.errors.push({
      type: 'processing_error',
      message: error.message
    });
  }

  return { prompt: processed, metadata };
}

/**
 * Process @file and @directory inclusions
 */
async function processFileInclusions(prompt) {
  const filesIncluded = [];
  const errors = [];
  let processed = prompt;

  // Match @filepath or @directory
  // Supports: @file.js, @src/, @"path with spaces", @./relative/path
  const atFileRegex = /@(?:"([^"]+)"|'([^']+)'|([^\s,;!?()[\]{}]+))/g;

  const matches = [];
  let match;
  while ((match = atFileRegex.exec(prompt)) !== null) {
    const filePath = match[1] || match[2] || match[3];
    matches.push({ fullMatch: match[0], path: filePath, index: match.index });
  }

  // Process matches in reverse order to maintain correct indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, path: filePath, index } = matches[i];

    try {
      const resolvedPath = path.resolve(filePath);

      if (!existsSync(resolvedPath)) {
        // Try to find the file with glob
        const globResults = await glob(`**/*${path.basename(filePath)}*`, {
          ignore: ['**/node_modules/**', '**/.git/**'],
          absolute: true,
          onlyFiles: true,
          caseSensitiveMatch: false
        });

        if (globResults.length > 0) {
          // Use the first match
          const foundPath = globResults[0];
          const content = await readFileOrDirectory(foundPath);
          const replacement = `\n\n<file path="${foundPath}">\n${content}\n</file>\n\n`;
          processed = processed.substring(0, index) + replacement + processed.substring(index + fullMatch.length);
          filesIncluded.push({ path: foundPath, found: true });
        } else {
          errors.push({
            type: 'file_not_found',
            path: filePath,
            message: `File not found: ${filePath}`
          });
          // Remove the @reference
          processed = processed.substring(0, index) + `[File not found: ${filePath}]` + processed.substring(index + fullMatch.length);
        }
      } else {
        const content = await readFileOrDirectory(resolvedPath);
        const replacement = `\n\n<file path="${resolvedPath}">\n${content}\n</file>\n\n`;
        processed = processed.substring(0, index) + replacement + processed.substring(index + fullMatch.length);
        filesIncluded.push({ path: resolvedPath, found: true });
      }
    } catch (error) {
      errors.push({
        type: 'file_read_error',
        path: filePath,
        message: error.message
      });
      processed = processed.substring(0, index) + `[Error reading ${filePath}: ${error.message}]` + processed.substring(index + fullMatch.length);
    }
  }

  return { prompt: processed, filesIncluded, errors };
}

/**
 * Read file or directory contents
 */
async function readFileOrDirectory(filePath) {
  const stats = statSync(filePath);

  if (stats.isDirectory()) {
    // List directory contents
    const files = await glob(path.join(filePath, '**/*'), {
      ignore: ['**/node_modules/**', '**/.git/**'],
      onlyFiles: true,
      absolute: false,
      cwd: filePath
    });

    return `Directory listing of ${filePath}:\n${files.slice(0, 100).join('\n')}${files.length > 100 ? '\n... and ' + (files.length - 100) + ' more files' : ''}`;
  } else {
    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');
    // Limit to 50KB to avoid huge prompts
    if (content.length > 50000) {
      return content.substring(0, 50000) + '\n\n... (truncated, file is too large)';
    }
    return content;
  }
}

/**
 * Process !{shell command} syntax
 */
async function processShellCommands(prompt) {
  const commands = [];
  const errors = [];
  let processed = prompt;

  // Match !{...} with support for nested braces
  const shellRegex = /!\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

  const matches = [];
  let match;
  while ((match = shellRegex.exec(prompt)) !== null) {
    matches.push({
      fullMatch: match[0],
      command: match[1].trim(),
      index: match.index
    });
  }

  // Process in reverse order
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, command, index } = matches[i];

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 5 * 1024 * 1024, // 5MB
        timeout: 10000, // 10 seconds
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
      });

      const output = stdout || stderr || '(no output)';
      const replacement = `\n\n<shell-output command="${command}">\n${output}\n</shell-output>\n\n`;
      processed = processed.substring(0, index) + replacement + processed.substring(index + fullMatch.length);

      commands.push({
        command,
        success: true,
        output
      });
    } catch (error) {
      errors.push({
        type: 'shell_execution_error',
        command,
        message: error.message
      });

      const errorMsg = error.stderr || error.message;
      const replacement = `\n\n<shell-error command="${command}">\n${errorMsg}\n</shell-error>\n\n`;
      processed = processed.substring(0, index) + replacement + processed.substring(index + fullMatch.length);

      commands.push({
        command,
        success: false,
        error: errorMsg
      });
    }
  }

  return { prompt: processed, commands, errors };
}

/**
 * Check if prompt contains special syntax
 */
export function hasSpecialSyntax(prompt) {
  return /@[\w./]/.test(prompt) || /!\{/.test(prompt);
}
