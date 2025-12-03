/**
 * Tools System - File operations, shell commands, grep, glob
 * Adapted from polza-cli's tools
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import fg from 'fast-glob';
import { join } from 'path';

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
        const content = readFileSync(path, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    write_file: async ({ path, content }) => {
      try {
        writeFileSync(path, content, 'utf-8');
        return { success: true, message: `File written: ${path}` };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    list_directory: async ({ path }) => {
      try {
        const entries = readdirSync(path, { withFileTypes: true });
        const files = entries.map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }));
        return { success: true, files };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    glob_files: async ({ pattern, cwd = process.cwd() }) => {
      try {
        const files = await fg(pattern, { cwd, absolute: false });
        return { success: true, files };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    file_exists: async ({ path }) => {
      try {
        const exists = existsSync(path);
        const stats = exists ? statSync(path) : null;
        return {
          success: true,
          exists,
          isFile: exists ? stats.isFile() : false,
          isDirectory: exists ? stats.isDirectory() : false,
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };

  // Add shell execution handler only if YOLO mode is enabled
  if (yoloMode) {
    handlers.execute_shell = async ({ command }) => {
      try {
        const output = execSync(command, {
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 10, // 10MB
          timeout: 30000, // 30 seconds
        });
        return { success: true, output };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          output: error.stdout || '',
          stderr: error.stderr || '',
        };
      }
    };
  }

  return handlers;
}
