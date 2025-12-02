#!/usr/bin/env node

/**
 * Basic tests for Polza CLI (no API key required for structure validation)
 */

import { fileSystemTools, executeFileSystemTool } from './src/tools/filesystem.js';
import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      passed++;
    } catch (error) {
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
      failed++;
    }
  };
}

async function runTests() {
  console.log(`${colors.cyan}Running Polza CLI Tests${colors.reset}\n`);

  // Test 1: File system tools are defined
  await test('File system tools are properly defined', async () => {
    if (!Array.isArray(fileSystemTools)) {
      throw new Error('fileSystemTools is not an array');
    }
    if (fileSystemTools.length === 0) {
      throw new Error('No file system tools defined');
    }
  })();

  // Test 2: All tools have required structure
  await test('All tools have proper structure', async () => {
    for (const tool of fileSystemTools) {
      if (!tool.type || !tool.function) {
        throw new Error('Tool missing type or function');
      }
      if (!tool.function.name || !tool.function.description) {
        throw new Error('Tool missing name or description');
      }
    }
  })();

  // Test 3: Create test file
  const testFile = 'test-polza-cli-temp.txt';
  const testContent = 'Hello from Polza CLI test!';

  await test('write_file tool creates file', async () => {
    const result = await executeFileSystemTool('write_file', {
      file_path: testFile,
      content: testContent
    });
    if (!result.success) {
      throw new Error('write_file failed');
    }
  })();

  // Test 4: Read test file
  await test('read_file tool reads file', async () => {
    const result = await executeFileSystemTool('read_file', {
      file_path: testFile
    });
    if (!result.success || result.content !== testContent) {
      throw new Error('read_file failed or content mismatch');
    }
  })();

  // Test 5: Check file exists
  await test('file_exists tool detects existing file', async () => {
    const result = await executeFileSystemTool('file_exists', {
      path: testFile
    });
    if (!result.exists || result.type !== 'file') {
      throw new Error('file_exists failed to detect file');
    }
  })();

  // Test 6: List directory
  await test('list_directory tool lists files', async () => {
    const result = await executeFileSystemTool('list_directory', {
      directory_path: '.'
    });
    if (!result.success || !Array.isArray(result.items)) {
      throw new Error('list_directory failed');
    }
  })();

  // Test 7: Delete test file
  await test('delete_file tool removes file', async () => {
    const result = await executeFileSystemTool('delete_file', {
      file_path: testFile
    });
    if (!result.success) {
      throw new Error('delete_file failed');
    }
  })();

  // Test 8: Verify file is deleted
  await test('file_exists confirms file deletion', async () => {
    const result = await executeFileSystemTool('file_exists', {
      path: testFile
    });
    if (result.exists) {
      throw new Error('File still exists after deletion');
    }
  })();

  // Test 9: Create directory
  const testDir = 'test-polza-cli-dir';
  await test('create_directory tool creates directory', async () => {
    const result = await executeFileSystemTool('create_directory', {
      directory_path: testDir
    });
    if (!result.success) {
      throw new Error('create_directory failed');
    }
  })();

  // Test 10: Verify directory exists
  await test('file_exists detects directory', async () => {
    const result = await executeFileSystemTool('file_exists', {
      path: testDir
    });
    if (!result.exists || result.type !== 'directory') {
      throw new Error('Directory not detected');
    }
  })();

  // Cleanup: Remove test directory
  await fs.rm(testDir, { recursive: true, force: true });

  // Summary
  console.log(`\n${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All tests passed!${colors.reset}`);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});
