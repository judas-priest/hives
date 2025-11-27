#!/usr/bin/env node

/**
 * Polza AI Integration Test Script
 *
 * Tests the Polza AI client integration for K_DA
 * Run with: node k_da/experiments/test-polza-integration.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PolzaAIClient } = require('../src/polza-client.js');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

function success(message) {
  log('✅', colors.green, message);
}

function error(message) {
  log('❌', colors.red, message);
}

function info(message) {
  log('ℹ️ ', colors.blue, message);
}

function warn(message) {
  log('⚠️ ', colors.yellow, message);
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪  Polza AI Integration Test Suite');
  console.log('='.repeat(60) + '\n');

  // Check for API key
  if (!process.env.POLZA_API_KEY) {
    error('POLZA_API_KEY environment variable not set');
    console.log('\nPlease set your Polza AI API key:');
    console.log('  export POLZA_API_KEY="ak_your_api_key_here"\n');
    process.exit(1);
  }

  let client;
  const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Test 1: Client Initialization
  console.log('📦 Test 1: Client Initialization');
  try {
    client = new PolzaAIClient({
      model: 'anthropic/claude-sonnet-4.5'
    });
    success('Client initialized successfully');
    info(`Configuration: ${JSON.stringify(client.getConfig(), null, 2)}`);
    testResults.passed++;
  } catch (err) {
    error(`Client initialization failed: ${err.message}`);
    testResults.failed++;
    process.exit(1);
  }

  // Test 2: List Models
  console.log('\n📋 Test 2: List Available Models');
  try {
    const modelsResponse = await client.listModels();
    const models = modelsResponse.data || [];

    if (models.length > 0) {
      success(`Found ${models.length} models`);
      info('Sample models:');
      models.slice(0, 5).forEach(model => {
        console.log(`   - ${model.id}`);
      });
      testResults.passed++;
    } else {
      warn('No models found in response');
      testResults.failed++;
    }
  } catch (err) {
    error(`Failed to list models: ${err.message}`);
    testResults.failed++;
  }

  // Test 3: Get Specific Model Info
  console.log('\n🔍 Test 3: Get Model Information');
  try {
    const modelId = 'anthropic/claude-sonnet-4.5';
    const modelInfo = await client.getModel(modelId);

    success(`Retrieved info for ${modelId}`);
    info(`Model details: ${JSON.stringify(modelInfo, null, 2).substring(0, 200)}...`);
    testResults.passed++;
  } catch (err) {
    error(`Failed to get model info: ${err.message}`);
    testResults.failed++;
  }

  // Test 4: Simple Completion
  console.log('\n💬 Test 4: Simple Text Completion');
  try {
    const prompt = 'Say "Hello from Polza AI!" in exactly 5 words.';
    info(`Prompt: "${prompt}"`);

    const response = await client.complete(prompt);

    if (response && response.length > 0) {
      success('Completion successful');
      console.log(`   Response: "${response}"`);
      testResults.passed++;
    } else {
      warn('Empty response received');
      testResults.failed++;
    }
  } catch (err) {
    error(`Completion failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 5: Streaming Completion
  console.log('\n🌊 Test 5: Streaming Completion');
  try {
    const prompt = 'Count from 1 to 5, one number per word.';
    info(`Prompt: "${prompt}"`);

    process.stdout.write('   Stream output: ');
    let streamedContent = '';

    for await (const chunk of client.streamComplete(prompt)) {
      if (typeof chunk === 'string') {
        streamedContent += chunk;
        process.stdout.write(chunk);
      }
    }

    console.log(''); // New line

    if (streamedContent.length > 0) {
      success('Streaming successful');
      testResults.passed++;
    } else {
      warn('No content streamed');
      testResults.failed++;
    }
  } catch (err) {
    error(`\nStreaming failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 6: Chat with History
  console.log('\n💭 Test 6: Chat with Message History');
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant that responds concisely.' },
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '4' },
      { role: 'user', content: 'What is 2+2+1?' }
    ];

    info('Testing chat continuation...');

    const response = await client.createChatCompletion(messages);
    const answer = response.choices[0]?.message?.content;

    if (answer && answer.includes('5')) {
      success('Chat history maintained correctly');
      console.log(`   Answer: "${answer}"`);
      testResults.passed++;
    } else {
      warn(`Unexpected answer: "${answer}"`);
      testResults.failed++;
    }
  } catch (err) {
    error(`Chat with history failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 7: Cost Tracking
  console.log('\n💰 Test 7: Cost Tracking');
  try {
    const prompt = 'Hi';
    const response = await client.createChatCompletion([
      { role: 'user', content: prompt }
    ]);

    if (response.usage) {
      success('Usage statistics available');
      info(`Tokens used: ${response.usage.total_tokens}`);
      if (response.usage.cost !== undefined) {
        info(`Cost: ${response.usage.cost} RUB`);
      }
      testResults.passed++;
    } else {
      warn('No usage statistics in response');
      testResults.failed++;
    }
  } catch (err) {
    error(`Cost tracking test failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 8: Different Model
  console.log('\n🔄 Test 8: Using Different Model (GPT-4)');
  try {
    const prompt = 'Respond with just the word "OK"';
    info('Testing with openai/gpt-4o...');

    const response = await client.complete(prompt, {
      model: 'openai/gpt-4o'
    });

    if (response) {
      success('GPT-4 model works');
      console.log(`   Response: "${response}"`);
      testResults.passed++;
    } else {
      warn('Empty response from GPT-4');
      testResults.failed++;
    }
  } catch (err) {
    error(`Different model test failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 9: Temperature Control
  console.log('\n🌡️  Test 9: Temperature Control');
  try {
    const prompt = 'Say hello';

    // Low temperature (deterministic)
    const response1 = await client.complete(prompt, { temperature: 0.1 });
    const response2 = await client.complete(prompt, { temperature: 0.1 });

    success('Temperature control works');
    info(`Response 1: "${response1.substring(0, 50)}..."`);
    info(`Response 2: "${response2.substring(0, 50)}..."`);

    if (response1 === response2) {
      info('Responses are identical (expected with low temperature)');
    } else {
      info('Responses differ slightly (still acceptable)');
    }

    testResults.passed++;
  } catch (err) {
    error(`Temperature control test failed: ${err.message}`);
    testResults.failed++;
  }

  // Test 10: Error Handling
  console.log('\n⚠️  Test 10: Error Handling');
  try {
    const invalidClient = new PolzaAIClient({
      apiKey: 'invalid_key_12345'
    });

    await invalidClient.complete('Test');

    warn('Error handling may not be working - should have thrown error');
    testResults.failed++;
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      success('Error handling works correctly');
      info(`Caught expected error: ${err.message}`);
      testResults.passed++;
    } else {
      warn(`Unexpected error type: ${err.message}`);
      testResults.failed++;
    }
  }

  // Test Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`❌ Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`⏭️  Skipped: ${colors.yellow}${testResults.skipped}${colors.reset}`);

  const total = testResults.passed + testResults.failed + testResults.skipped;
  const successRate = ((testResults.passed / total) * 100).toFixed(1);

  console.log(`\nSuccess Rate: ${successRate}%`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Polza AI integration is working correctly.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the test suite
runTests().catch(err => {
  error(`Test suite crashed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
