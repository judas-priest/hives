#!/usr/bin/env node
/**
 * Test script for Polza HTTP API integration
 * Tests the OpenAI-compatible endpoint directly without CLI
 */

// Simple test to verify Polza API connectivity using fetch
async function testPolzaAPI() {
  const apiKey = process.env.POLZA_API_KEY;

  if (!apiKey) {
    console.error('❌ POLZA_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('🔍 Testing Polza API connection...');
  console.log(`📦 API Key: ${apiKey.substring(0, 10)}...`);

  try {
    const response = await fetch('https://api.polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5-20250929',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Polza API!" and nothing else.'
          }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Polza API connection successful!');
    console.log('📝 Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]) {
      console.log('\n💬 Message:', data.choices[0].message.content);
    }

    if (data.usage) {
      console.log('\n📊 Usage:');
      console.log(`   Tokens: ${data.usage.total_tokens}`);
      console.log(`   Cost: ${data.usage.cost} руб.`);
    }

  } catch (error) {
    console.error('❌ Error testing Polza API:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Test with tool calling
async function testPolzaToolCalling() {
  const apiKey = process.env.POLZA_API_KEY;

  if (!apiKey) {
    console.error('❌ POLZA_API_KEY environment variable not set');
    process.exit(1);
  }

  console.log('\n🔧 Testing Polza API with tool calling...');

  try {
    const response = await fetch('https://api.polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5-20250929',
        messages: [
          {
            role: 'user',
            content: 'What is the current time in Tokyo? Use the get_current_time tool.'
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_current_time',
              description: 'Get the current time in a specific timezone',
              parameters: {
                type: 'object',
                properties: {
                  timezone: {
                    type: 'string',
                    description: 'The timezone (e.g., "Asia/Tokyo", "America/New_York")'
                  }
                },
                required: ['timezone']
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Tool calling test successful!');
    console.log('📝 Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0] && data.choices[0].message.tool_calls) {
      console.log('\n🔧 Tool calls detected:');
      data.choices[0].message.tool_calls.forEach((toolCall, index) => {
        console.log(`   ${index + 1}. ${toolCall.function.name}`);
        console.log(`      Arguments: ${toolCall.function.arguments}`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing tool calling:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testPolzaAPI()
  .then(() => testPolzaToolCalling())
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
