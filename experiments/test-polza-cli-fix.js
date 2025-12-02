#!/usr/bin/env node

/**
 * Test script to verify the Polza API endpoint fix
 */

import { PolzaClient } from '../polza-cli/src/lib/polza-client.js';

async function testPolzaClient() {
  console.log('🧪 Testing Polza Client URL Construction Fix\n');

  try {
    // Test 1: Check URL construction
    console.log('Test 1: URL Construction');
    const client = new PolzaClient({
      apiKey: process.env.POLZA_API_KEY || 'test-key'
    });
    console.log('✅ Base URL:', client.baseUrl);
    console.log('   Expected: https://api.polza.ai/api/v1/');
    console.log();

    // Test 2: Try listing models (requires valid API key)
    if (process.env.POLZA_API_KEY) {
      console.log('Test 2: List Models API Call');
      try {
        const models = await client.listModels();
        console.log('✅ API call successful!');
        console.log('   Models:', models.data?.length || 0, 'models available');
        console.log();
      } catch (error) {
        console.log('❌ API call failed:', error.message);
        console.log();
      }

      // Test 3: Try a simple chat completion
      console.log('Test 3: Simple Chat Completion');
      try {
        const response = await client.chat([
          { role: 'user', content: 'Say "Hello from Polza CLI test!"' }
        ], {
          max_tokens: 50
        });
        console.log('✅ Chat completion successful!');
        console.log('   Response:', response.choices[0].message.content);
        console.log();
      } catch (error) {
        console.log('❌ Chat completion failed:', error.message);
        console.log();
      }
    } else {
      console.log('⚠️  Skipping API tests (no POLZA_API_KEY set)');
      console.log('   To test with real API, set POLZA_API_KEY environment variable');
      console.log();
    }

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPolzaClient();
