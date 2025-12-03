/**
 * Advanced Tools - grep, shell execution, web search
 * Additional tools based on gemini-cli functionality
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import glob from 'fast-glob';

const execAsync = promisify(exec);

/**
 * Define advanced tools
 */
export const advancedTools = [
  {
    type: 'function',
    function: {
      name: 'grep_files',
      description: 'Search for a pattern in files using grep-like functionality. Use regex patterns to search file contents.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The regex pattern to search for'
          },
          path: {
            type: 'string',
            description: 'The directory or file path to search in (default: current directory)'
          },
          file_pattern: {
            type: 'string',
            description: 'Glob pattern to filter files (e.g., "*.js", "**/*.txt")'
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Whether the search should be case sensitive (default: false)'
          }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_shell',
      description: 'Execute a shell command and return the output. Use with caution.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute'
          },
          working_directory: {
            type: 'string',
            description: 'The working directory for the command (default: current directory)'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information. Returns search results with snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'glob_files',
      description: 'Find files matching a glob pattern (e.g., "src/**/*.js", "*.md")',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The glob pattern to match files'
          },
          ignore_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns to ignore (e.g., ["node_modules/**", ".git/**"])'
          }
        },
        required: ['pattern']
      }
    }
  }
];

/**
 * Execute an advanced tool
 */
export async function executeAdvancedTool(toolName, args, yolomode = false) {
  try {
    switch (toolName) {
      case 'grep_files':
        return await grepFiles(args.pattern, args.path, args.file_pattern, args.case_sensitive);

      case 'execute_shell':
        if (!yolomode) {
          return {
            error: true,
            message: 'Shell execution requires --yolomode flag for safety. Restart with --yolomode to enable.'
          };
        }
        return await executeShell(args.command, args.working_directory);

      case 'web_search':
        return await webSearch(args.query);

      case 'glob_files':
        return await globFiles(args.pattern, args.ignore_patterns);

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
 * Grep files - search for patterns in files
 */
async function grepFiles(pattern, searchPath = '.', filePattern = '*', caseSensitive = false) {
  try {
    const resolvedPath = path.resolve(searchPath);

    // Default ignore patterns
    const defaultIgnore = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**'
    ];

    // Find files
    let files;
    if (filePattern && filePattern !== '*') {
      const globPattern = path.join(resolvedPath, '**', filePattern);
      files = await glob(globPattern, { ignore: defaultIgnore, absolute: true });
    } else {
      files = await glob(path.join(resolvedPath, '**/*'), {
        ignore: defaultIgnore,
        absolute: true,
        onlyFiles: true
      });
    }

    // Search files
    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    const results = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const matches = [];

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            matches.push({
              line_number: index + 1,
              content: line.trim(),
              file: file
            });
          }
        });

        if (matches.length > 0) {
          results.push({
            file: file,
            matches: matches,
            match_count: matches.length
          });
        }
      } catch (err) {
        // Skip files that can't be read (binary, permission issues, etc.)
        continue;
      }
    }

    return {
      success: true,
      pattern: pattern,
      search_path: resolvedPath,
      results: results,
      total_matches: results.reduce((sum, r) => sum + r.match_count, 0),
      files_with_matches: results.length
    };
  } catch (error) {
    throw new Error(`Grep failed: ${error.message}`);
  }
}

/**
 * Execute shell command
 */
async function executeShell(command, workingDirectory = '.') {
  try {
    const cwd = path.resolve(workingDirectory);

    if (!existsSync(cwd)) {
      throw new Error(`Working directory does not exist: ${cwd}`);
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000 // 30 seconds
    });

    return {
      success: true,
      command: command,
      working_directory: cwd,
      stdout: stdout,
      stderr: stderr,
      exit_code: 0
    };
  } catch (error) {
    return {
      success: false,
      command: command,
      working_directory: path.resolve(workingDirectory),
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exit_code: error.code || 1
    };
  }
}

/**
 * Web search - mock implementation (would need actual search API)
 */
async function webSearch(query) {
  // Note: This is a mock implementation
  // In a real implementation, you would integrate with a search API
  // like Google Search, Bing, or DuckDuckGo
  return {
    success: true,
    query: query,
    message: 'Web search is a placeholder. To implement real search, integrate with a search API (Google Custom Search, Bing, etc.) and add your API key.',
    note: 'This feature requires integration with a search provider API.',
    suggestion: 'For now, you can use the execute_shell tool with curl to fetch web pages, or integrate a search API in the future.'
  };
}

/**
 * Glob files - find files matching patterns
 */
async function globFiles(pattern, ignorePatterns = []) {
  try {
    const defaultIgnore = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**'
    ];

    const allIgnorePatterns = [...defaultIgnore, ...(ignorePatterns || [])];

    const files = await glob(pattern, {
      ignore: allIgnorePatterns,
      absolute: true,
      onlyFiles: true
    });

    return {
      success: true,
      pattern: pattern,
      files: files,
      count: files.length
    };
  } catch (error) {
    throw new Error(`Glob failed: ${error.message}`);
  }
}
