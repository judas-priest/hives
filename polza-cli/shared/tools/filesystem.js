/**
 * File System Tools
 * Provides file system access capabilities for the AI assistant
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync, statSync } from 'fs';

/**
 * Define available file system tools
 */
export const fileSystemTools = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the file system',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The absolute or relative path to the file to read'
          }
        },
        required: ['file_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file in the file system',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The absolute or relative path to the file to write'
          },
          content: {
            type: 'string',
            description: 'The content to write to the file'
          }
        },
        required: ['file_path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files and directories in a given directory',
      parameters: {
        type: 'object',
        properties: {
          directory_path: {
            type: 'string',
            description: 'The absolute or relative path to the directory to list'
          }
        },
        required: ['directory_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Create a new directory',
      parameters: {
        type: 'object',
        properties: {
          directory_path: {
            type: 'string',
            description: 'The absolute or relative path to the directory to create'
          }
        },
        required: ['directory_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file from the file system',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The absolute or relative path to the file to delete'
          }
        },
        required: ['file_path']
      }
    }
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
            description: 'The absolute or relative path to check'
          }
        },
        required: ['path']
      }
    }
  }
];

/**
 * Execute a file system tool
 */
export async function executeFileSystemTool(toolName, args) {
  try {
    switch (toolName) {
      case 'read_file':
        return await readFile(args.file_path);

      case 'write_file':
        return await writeFile(args.file_path, args.content);

      case 'list_directory':
        return await listDirectory(args.directory_path);

      case 'create_directory':
        return await createDirectory(args.directory_path);

      case 'delete_file':
        return await deleteFile(args.file_path);

      case 'file_exists':
        return await fileExists(args.path);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Read file contents
 */
async function readFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const content = await fs.readFile(resolvedPath, 'utf-8');
  return {
    success: true,
    file_path: resolvedPath,
    content: content,
    size: content.length
  };
}

/**
 * Write file contents
 */
async function writeFile(filePath, content) {
  const resolvedPath = path.resolve(filePath);
  await fs.writeFile(resolvedPath, content, 'utf-8');
  return {
    success: true,
    file_path: resolvedPath,
    bytes_written: content.length
  };
}

/**
 * List directory contents
 */
async function listDirectory(directoryPath) {
  const resolvedPath = path.resolve(directoryPath);
  const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

  const items = entries.map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(resolvedPath, entry.name)
  }));

  return {
    success: true,
    directory_path: resolvedPath,
    items: items,
    count: items.length
  };
}

/**
 * Create directory
 */
async function createDirectory(directoryPath) {
  const resolvedPath = path.resolve(directoryPath);
  await fs.mkdir(resolvedPath, { recursive: true });
  return {
    success: true,
    directory_path: resolvedPath
  };
}

/**
 * Delete file
 */
async function deleteFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  await fs.unlink(resolvedPath);
  return {
    success: true,
    file_path: resolvedPath
  };
}

/**
 * Check if file exists
 */
async function fileExists(checkPath) {
  const resolvedPath = path.resolve(checkPath);
  const exists = existsSync(resolvedPath);

  let type = null;
  if (exists) {
    const stats = statSync(resolvedPath);
    type = stats.isDirectory() ? 'directory' : 'file';
  }

  return {
    exists: exists,
    path: resolvedPath,
    type: type
  };
}
