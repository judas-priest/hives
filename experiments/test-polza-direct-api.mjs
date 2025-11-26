#!/usr/bin/env node
/**
 * Test script for Polza AI direct HTTP API integration
 *
 * This script tests the new Polza implementation that uses direct HTTP API calls
 * instead of the agent CLI. It follows the OpenAI-compatible format as documented
 * in polza.txt and implemented in agent_polza2.
 *
 * Usage:
 *   POLZA_API_KEY="your-key" node experiments/test-polza-direct-api.mjs
 */

const API_BASE_URL = 'https://api.polza.ai/api/v1';

// Test function to make a simple request
async function testSimpleRequest() {
  console.log('🧪 Test 1: Simple Request (Non-streaming)');
  console.log('─'.repeat(60));

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    console.error('❌ POLZA_API_KEY environment variable not set');
    console.error('   Please set it: export POLZA_API_KEY="your-api-key"');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20250219',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello from Polza API!" in exactly those words.' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Response received:');
    console.log(`   Content: ${data.choices[0].message.content}`);
    console.log(`   Model: ${data.model}`);
    if (data.usage) {
      console.log(`   Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
      if (data.usage.cost !== undefined) {
        console.log(`   Cost: ${data.usage.cost} руб.`);
      }
    }
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Test function for streaming
async function testStreamingRequest() {
  console.log('🧪 Test 2: Streaming Request');
  console.log('─'.repeat(60));

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    console.error('❌ POLZA_API_KEY environment variable not set');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20250219',
        messages: [
          { role: 'user', content: 'Count from 1 to 5, one number per line.' }
        ],
        stream: true,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return false;
    }

    console.log('✅ Streaming response:');
    console.log('   Content: ', '');
    process.stdout.write('   ');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let usage = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const delta = parsed.choices[0].delta.content;
            if (delta) {
              fullContent += delta;
              process.stdout.write(delta);
            }
          }

          if (parsed.usage) {
            usage = parsed.usage;
          }
        } catch (err) {
          // Ignore JSON parse errors
        }
      }
    }

    console.log('\n');
    if (usage) {
      console.log(`   Tokens: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
      if (usage.cost !== undefined) {
        console.log(`   Cost: ${usage.cost} руб.`);
      }
    }
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Test model mapping
function testModelMapping() {
  console.log('🧪 Test 3: Model Mapping');
  console.log('─'.repeat(60));

  const testCases = [
    { input: 'sonnet', expected: 'anthropic/claude-3-5-sonnet-20250219' },
    { input: 'gpt4o', expected: 'openai/gpt-4o' },
    { input: 'deepseek-r1', expected: 'deepseek/deepseek-r1' },
    { input: 'anthropic/claude-opus-4-20250418', expected: 'anthropic/claude-opus-4-20250418' }
  ];

  let allPassed = true;
  for (const test of testCases) {
    // Simulate the mapModelToId function
    const modelMap = {
      'sonnet': 'anthropic/claude-3-5-sonnet-20250219',
      'claude-sonnet': 'anthropic/claude-3-5-sonnet-20250219',
      'sonnet-4': 'anthropic/claude-sonnet-4-20250514',
      'sonnet-4.5': 'anthropic/claude-sonnet-4-5-20250929',
      'opus': 'anthropic/claude-opus-4-20250418',
      'haiku': 'anthropic/claude-3-5-haiku-20250310',
      'gpt4o': 'openai/gpt-4o',
      'gpt-4o': 'openai/gpt-4o',
      'gpt4': 'openai/gpt-4',
      'gpt-4': 'openai/gpt-4',
      'o1': 'openai/o1',
      'o1-preview': 'openai/o1-preview',
      'deepseek-r1': 'deepseek/deepseek-r1',
      'deepseek': 'deepseek/deepseek-chat',
      'gemini': 'google/gemini-pro',
      'gemini-pro': 'google/gemini-pro'
    };
    const result = modelMap[test.input] || test.input;

    if (result === test.expected) {
      console.log(`✅ ${test.input} → ${result}`);
    } else {
      console.log(`❌ ${test.input} → ${result} (expected: ${test.expected})`);
      allPassed = false;
    }
  }

  console.log('');
  return allPassed;
}

// Main test runner
async function main() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  Polza AI Direct HTTP API Integration Tests');
  console.log('═'.repeat(60));
  console.log('');

  // Test 3: Model mapping (always runs)
  const mappingResult = testModelMapping();

  // Check if API key is available for API tests
  if (!process.env.POLZA_API_KEY) {
    console.log('⚠️  Skipping API tests: POLZA_API_KEY not set');
    console.log('   To run API tests, set: export POLZA_API_KEY="your-api-key"');
    console.log('');
    console.log('─'.repeat(60));
    console.log(`Final Results: Model mapping ${mappingResult ? 'PASSED' : 'FAILED'}`);
    console.log('─'.repeat(60));
    console.log('');
    process.exit(mappingResult ? 0 : 1);
  }

  // Run API tests
  const test1Result = await testSimpleRequest();
  const test2Result = await testStreamingRequest();

  // Summary
  console.log('═'.repeat(60));
  console.log('  Test Summary');
  console.log('═'.repeat(60));
  console.log(`  Test 1 (Simple Request):    ${test1Result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Test 2 (Streaming Request):  ${test2Result ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Test 3 (Model Mapping):      ${mappingResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('═'.repeat(60));
  console.log('');

  const allPassed = test1Result && test2Result && mappingResult;
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
