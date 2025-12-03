#!/usr/bin/env node

/**
 * Simple test for modern-cli without tools
 */

import { PolzaClient } from '../modern-cli/src/lib/polza-client.js';

async function test() {
  console.log('Testing modern-cli PolzaClient...\n');

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    console.error('Error: POLZA_API_KEY not set');
    process.exit(1);
  }

  const client = new PolzaClient(apiKey);

  try {
    console.log('Test 1: Simple chat without tools');
    const response1 = await client.chat('Say "Hello World" in one word', {
      model: 'anthropic/claude-sonnet-4.5',
    });
    console.log('✓ Success!');
    console.log('Response:', response1.choices[0].message.content);
    console.log();

    console.log('Test 2: Chat with empty tools array (should work now)');
    const response2 = await client.chat('Say "Test passed"', {
      model: 'anthropic/claude-sonnet-4.5',
      tools: [],
    });
    console.log('✓ Success!');
    console.log('Response:', response2.choices[0].message.content);
    console.log();

    console.log('All tests passed! ✓');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

test();
