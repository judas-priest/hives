/**
 * Tools System - File operations, shell commands, grep, glob
 * Adapted from polza-cli's tools
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import fg from 'fast-glob';
import { join } from 'path';
import { fetchUrl, htmlToText } from '../utils/web-fetch.js';
import { FileSystemError, NetworkError, wrapError } from '../utils/errors.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

/**
 * Get tool definitions for Polza AI
 */
export function getTools(yoloMode = false) {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read',
            },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file',
            },
            content: {
              type: 'string',
              description: 'Content to write',
            },
          },
          required: ['path', 'content'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_directory',
        description: 'List contents of a directory',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory',
            },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'glob_files',
        description: 'Find files matching a glob pattern',
        parameters: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob pattern (e.g., "**/*.js")',
            },
            cwd: {
              type: 'string',
              description: 'Working directory (optional)',
            },
          },
          required: ['pattern'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'file_exists',
        description: 'Check if a file or directory exists',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to check',
            },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'web_fetch',
        description: 'Fetch content from a URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch',
            },
            format: {
              type: 'string',
              description: 'Response format: "html" (default) or "text" (plain text)',
              enum: ['html', 'text'],
            },
          },
          required: ['url'],
        },
      },
    },
  ];

  // Add shell execution tool only if YOLO mode is enabled
  if (yoloMode) {
    tools.push({
      type: 'function',
      function: {
        name: 'execute_shell',
        description: 'Execute a shell command (YOLO mode only)',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Shell command to execute',
            },
          },
          required: ['command'],
        },
      },
    });
  }

  return tools;
}

/**
 * Tool handler implementations
 */
export function getToolHandlers(yoloMode = false) {
  const handlers = {
    read_file: async ({ path }) => {
      try {
        logger.debug(`Reading file: ${path}`);
        const content = readFileSync(path, 'utf-8');
        logger.debug(`File read successfully: ${path}`, { size: content.length });
        return { success: true, content };
      } catch (error) {
        const wrappedError = wrapError(error, { path, operation: 'read' });
        logger.error(`Failed to read file: ${path}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },

    write_file: async ({ path, content }) => {
      try {
        logger.debug(`Writing file: ${path}`, { size: content.length });
        writeFileSync(path, content, 'utf-8');
        logger.info(`File written successfully: ${path}`);
        return { success: true, message: `File written: ${path}` };
      } catch (error) {
        const wrappedError = wrapError(error, { path, operation: 'write' });
        logger.error(`Failed to write file: ${path}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },

    list_directory: async ({ path }) => {
      try {
        logger.debug(`Listing directory: ${path}`);
        const entries = readdirSync(path, { withFileTypes: true });
        const files = entries.map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }));
        logger.debug(`Directory listed: ${path}`, { count: files.length });
        return { success: true, files };
      } catch (error) {
        const wrappedError = wrapError(error, { path, operation: 'list' });
        logger.error(`Failed to list directory: ${path}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },

    glob_files: async ({ pattern, cwd = process.cwd() }) => {
      try {
        logger.debug(`Globbing files: ${pattern}`, { cwd });
        const files = await fg(pattern, { cwd, absolute: false });
        logger.debug(`Glob completed: ${pattern}`, { count: files.length });
        return { success: true, files };
      } catch (error) {
        const wrappedError = wrapError(error, { pattern, cwd, operation: 'glob' });
        logger.error(`Failed to glob files: ${pattern}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },

    file_exists: async ({ path }) => {
      try {
        logger.debug(`Checking if file exists: ${path}`);
        const exists = existsSync(path);
        const stats = exists ? statSync(path) : null;
        return {
          success: true,
          exists,
          isFile: exists ? stats.isFile() : false,
          isDirectory: exists ? stats.isDirectory() : false,
        };
      } catch (error) {
        const wrappedError = wrapError(error, { path, operation: 'exists' });
        logger.error(`Failed to check file existence: ${path}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },

    web_fetch: async ({ url, format = 'html' }) => {
      try {
        logger.debug(`Fetching URL: ${url}`, { format });
        const response = await fetchUrl(url);
        let content = response.body;

        if (format === 'text') {
          content = htmlToText(content);
        }

        logger.info(`URL fetched successfully: ${url}`, {
          statusCode: response.statusCode,
          contentLength: content.length,
        });

        return {
          success: true,
          content,
          statusCode: response.statusCode,
          contentType: response.headers['content-type'],
          url: response.url,
        };
      } catch (error) {
        const wrappedError = error instanceof NetworkError
          ? error
          : new NetworkError(error.message, 0, url, { originalError: error.name });
        logger.error(`Failed to fetch URL: ${url}`, wrappedError);
        return {
          success: false,
          error: wrappedError.message,
          code: wrappedError.code,
        };
      }
    },
  };

  // Add shell execution handler only if YOLO mode is enabled
  if (yoloMode) {
    handlers.execute_shell = async ({ command }) => {
      try {
        logger.warn(`Executing shell command (YOLO mode): ${command}`);
        const output = execSync(command, {
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 10, // 10MB
          timeout: 30000, // 30 seconds
        });
        logger.info(`Shell command completed: ${command}`);
        return { success: true, output };
      } catch (error) {
        logger.error(`Shell command failed: ${command}`, error);
        return {
          success: false,
          error: error.message,
          output: error.stdout || '',
          stderr: error.stderr || '',
          code: error.code,
        };
      }
    };
  }

  return handlers;
}
