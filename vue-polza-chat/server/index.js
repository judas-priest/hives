const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')
const fs = require('fs').promises
const path = require('path')
const { promisify } = require('util')
const glob = require('glob')

const execAsync = promisify(exec)
const globAsync = promisify(glob)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Security: Define allowed directory (customize as needed)
const ALLOWED_ROOT = process.env.ALLOWED_ROOT || process.cwd()

/**
 * Validate path is within allowed directory
 */
function validatePath(filePath) {
  const absolutePath = path.resolve(filePath)
  const allowedPath = path.resolve(ALLOWED_ROOT)

  if (!absolutePath.startsWith(allowedPath)) {
    throw new Error('Access denied: Path outside allowed directory')
  }

  return absolutePath
}

/**
 * Tool execution handlers
 */
const toolHandlers = {
  /**
   * Execute bash command
   */
  bash: async (params) => {
    const { command, description, timeout = 30000 } = params

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      })

      return {
        title: description || `Bash: ${command}`,
        output: stdout || stderr || 'Command executed successfully',
        metadata: {
          command,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          success: true,
        },
      }
    } catch (error) {
      return {
        title: description || `Bash: ${command}`,
        output: `Error: ${error.message}`,
        metadata: {
          command,
          error: error.message,
          code: error.code,
          success: false,
        },
      }
    }
  },

  /**
   * Read file
   */
  read: async (params) => {
    const { file_path, offset = 0, limit } = params

    try {
      const absolutePath = validatePath(file_path)
      const content = await fs.readFile(absolutePath, 'utf-8')
      const lines = content.split('\n')

      const start = offset
      const end = limit ? start + limit : lines.length
      const selectedLines = lines.slice(start, end)

      // Add line numbers
      const numberedLines = selectedLines.map(
        (line, index) => `${start + index + 1}\t${line}`
      )

      return {
        title: `Read: ${path.basename(file_path)}`,
        output: numberedLines.join('\n'),
        metadata: {
          file_path: absolutePath,
          total_lines: lines.length,
          returned_lines: selectedLines.length,
          offset: start,
        },
      }
    } catch (error) {
      return {
        title: `Read: ${path.basename(file_path)}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },

  /**
   * Write file
   */
  write: async (params) => {
    const { file_path, content } = params

    try {
      const absolutePath = validatePath(file_path)
      const dir = path.dirname(absolutePath)

      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(absolutePath, content, 'utf-8')

      return {
        title: `Write: ${path.basename(file_path)}`,
        output: `Successfully wrote ${content.length} characters to ${file_path}`,
        metadata: {
          file_path: absolutePath,
          size: content.length,
        },
      }
    } catch (error) {
      return {
        title: `Write: ${path.basename(file_path)}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },

  /**
   * Edit file
   */
  edit: async (params) => {
    const { file_path, old_string, new_string, replace_all = false } = params

    try {
      const absolutePath = validatePath(file_path)
      const content = await fs.readFile(absolutePath, 'utf-8')

      let newContent
      if (replace_all) {
        newContent = content.split(old_string).join(new_string)
      } else {
        // Replace first occurrence
        const index = content.indexOf(old_string)
        if (index === -1) {
          throw new Error('String not found in file')
        }
        newContent =
          content.substring(0, index) +
          new_string +
          content.substring(index + old_string.length)
      }

      await fs.writeFile(absolutePath, newContent, 'utf-8')

      const replacements = replace_all
        ? content.split(old_string).length - 1
        : 1

      return {
        title: `Edit: ${path.basename(file_path)}`,
        output: `Successfully replaced ${replacements} occurrence(s) in ${file_path}`,
        metadata: {
          file_path: absolutePath,
          replacements,
          replace_all,
        },
      }
    } catch (error) {
      return {
        title: `Edit: ${path.basename(file_path)}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },

  /**
   * List directory
   */
  list: async (params) => {
    const { path: dirPath, recursive = false } = params

    try {
      const absolutePath = validatePath(dirPath)
      const entries = await fs.readdir(absolutePath, { withFileTypes: true })

      const result = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(absolutePath, entry.name)
          const stats = await fs.stat(fullPath)

          return {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.getTime(),
          }
        })
      )

      const formatted = result
        .map(
          (entry) =>
            `${entry.type === 'directory' ? 'd' : '-'} ${entry.name} (${entry.size} bytes)`
        )
        .join('\n')

      return {
        title: `List: ${path.basename(dirPath)}`,
        output: formatted,
        metadata: {
          path: absolutePath,
          entries: result,
          count: result.length,
        },
      }
    } catch (error) {
      return {
        title: `List: ${path.basename(dirPath)}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },

  /**
   * Glob pattern matching
   */
  glob: async (params) => {
    const { pattern, path: basePath = ALLOWED_ROOT } = params

    try {
      const absolutePath = validatePath(basePath)
      const matches = await globAsync(pattern, {
        cwd: absolutePath,
        absolute: true,
      })

      return {
        title: `Glob: ${pattern}`,
        output: matches.join('\n') || 'No matches found',
        metadata: {
          pattern,
          matches,
          count: matches.length,
        },
      }
    } catch (error) {
      return {
        title: `Glob: ${pattern}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },

  /**
   * Grep search
   */
  grep: async (params) => {
    const {
      pattern,
      path: searchPath = ALLOWED_ROOT,
      output_mode = 'files_with_matches',
      '-i': caseInsensitive = false,
      type,
    } = params

    try {
      const absolutePath = validatePath(searchPath)
      const flags = caseInsensitive ? 'i' : ''
      const regex = new RegExp(pattern, flags)

      // Simple grep implementation
      // In production, use ripgrep or similar
      const results = []
      const files = await globAsync('**/*', {
        cwd: absolutePath,
        nodir: true,
        absolute: true,
      })

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8')
          const lines = content.split('\n')

          const matches = []
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              matches.push({ line: index + 1, content: line })
            }
          })

          if (matches.length > 0) {
            if (output_mode === 'files_with_matches') {
              results.push(file)
            } else if (output_mode === 'content') {
              results.push(
                `${file}:\n${matches.map((m) => `  ${m.line}: ${m.content}`).join('\n')}`
              )
            } else if (output_mode === 'count') {
              results.push(`${file}: ${matches.length}`)
            }
          }
        } catch (err) {
          // Skip unreadable files
        }
      }

      return {
        title: `Grep: ${pattern}`,
        output: results.join('\n') || 'No matches found',
        metadata: {
          pattern,
          matches_count: results.length,
        },
      }
    } catch (error) {
      return {
        title: `Grep: ${pattern}`,
        output: `Error: ${error.message}`,
        metadata: {
          error: error.message,
        },
      }
    }
  },
}

/**
 * API Routes
 */

// Execute single tool
app.post('/api/tools/execute', async (req, res) => {
  const { tool, parameters } = req.body

  if (!tool || !parameters) {
    return res.status(400).json({ error: 'Missing tool or parameters' })
  }

  const handler = toolHandlers[tool]
  if (!handler) {
    return res.status(400).json({ error: `Unknown tool: ${tool}` })
  }

  try {
    const result = await handler(parameters)
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Execute batch tools
app.post('/api/tools/batch', async (req, res) => {
  const { tools } = req.body

  if (!Array.isArray(tools)) {
    return res.status(400).json({ error: 'Tools must be an array' })
  }

  try {
    const results = await Promise.all(
      tools.map(async ({ tool, parameters }) => {
        const handler = toolHandlers[tool]
        if (!handler) {
          return {
            success: false,
            error: `Unknown tool: ${tool}`,
          }
        }

        try {
          const result = await handler(parameters)
          return { success: true, result }
        } catch (error) {
          return {
            success: false,
            error: error.message,
          }
        }
      })
    )

    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// File system operations
app.get('/api/files/list', async (req, res) => {
  const { path: dirPath = ALLOWED_ROOT } = req.query

  try {
    const result = await toolHandlers.list({ path: dirPath })
    res.json(result.metadata.entries)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/files/read', async (req, res) => {
  const { path: filePath } = req.query

  if (!filePath) {
    return res.status(400).json({ error: 'Missing path parameter' })
  }

  try {
    const result = await toolHandlers.read({ file_path: filePath })
    res.json({ content: result.output })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/files/write', async (req, res) => {
  const { path: filePath, content } = req.body

  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Missing path or content' })
  }

  try {
    const result = await toolHandlers.write({ file_path: filePath, content })
    res.json({ success: true, result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/files/info', async (req, res) => {
  const { path: filePath } = req.query

  if (!filePath) {
    return res.status(400).json({ error: 'Missing path parameter' })
  }

  try {
    const absolutePath = validatePath(filePath)
    const stats = await fs.stat(absolutePath)

    res.json({
      path: absolutePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      created: stats.birthtime.getTime(),
      modified: stats.mtime.getTime(),
      accessed: stats.atime.getTime(),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', allowed_root: ALLOWED_ROOT })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Polza Chat Backend Server running on http://localhost:${PORT}`)
  console.log(`📁 Allowed root directory: ${ALLOWED_ROOT}`)
  console.log(`\n📝 Available endpoints:`)
  console.log(`   POST /api/tools/execute - Execute a single tool`)
  console.log(`   POST /api/tools/batch - Execute multiple tools`)
  console.log(`   GET  /api/files/list - List directory contents`)
  console.log(`   GET  /api/files/read - Read file contents`)
  console.log(`   POST /api/files/write - Write file contents`)
  console.log(`   GET  /api/files/info - Get file information`)
  console.log(`   GET  /health - Health check`)
})

module.exports = app
