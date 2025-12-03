#!/usr/bin/env node

/**
 * Example usage of Polza CLI programmatically
 */

import { PolzaClient } from './shared/lib/polza-client.js';
import { fileSystemTools, executeFileSystemTool } from './shared/tools/filesystem.js';

async function main() {
  try {
    console.log('=== Polza CLI Example ===\n');

    // Initialize client
    const client = new PolzaClient({
      apiKey: process.env.POLZA_API_KEY || 'your_api_key_here'
    });

    console.log(`Model: ${client.model}\n`);

    // Example 1: Simple completion
    console.log('Example 1: Simple completion');
    console.log('----------------------------');
    const simpleResponse = await client.complete('Say hello in 3 different languages');
    console.log(simpleResponse);
    console.log('\n');

    // Example 2: Chat with history
    console.log('Example 2: Chat with history');
    console.log('----------------------------');
    const messages = [
      { role: 'user', content: 'My name is Alice' },
    ];

    let response = await client.chat(messages);
    console.log('Assistant:', response.choices[0].message.content);

    messages.push(response.choices[0].message);
    messages.push({ role: 'user', content: 'What is my name?' });

    response = await client.chat(messages);
    console.log('Assistant:', response.choices[0].message.content);
    console.log('\n');

    // Example 3: Using tools
    console.log('Example 3: Using tools');
    console.log('----------------------------');
    console.log('Available tools:', fileSystemTools.map(t => t.function.name).join(', '));
    console.log('\n');

    // Example 4: Demonstrate tool execution
    console.log('Example 4: Tool execution');
    console.log('----------------------------');
    console.log('Checking if README.md exists...');
    const existsResult = await executeFileSystemTool('file_exists', { path: 'README.md' });
    console.log('Result:', JSON.stringify(existsResult, null, 2));
    console.log('\n');

    console.log('=== Examples Complete ===');
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\nMake sure POLZA_API_KEY is set:');
    console.error('export POLZA_API_KEY=ak_your_key_here');
  }
}

main();
