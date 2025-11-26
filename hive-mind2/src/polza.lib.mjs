#!/usr/bin/env node
// Polza AI-related utility functions
// Direct HTTP API implementation (OpenAI-compatible)

// Check if use is already defined (when imported from solve.mjs)
// If not, fetch it (when running standalone)
if (typeof globalThis.use === 'undefined') {
  globalThis.use = (await eval(await (await fetch('https://unpkg.com/use-m/use.js')).text())).use;
}

const { $ } = await use('command-stream');
const fs = (await use('fs')).promises;
const path = (await use('path')).default;
const os = (await use('os')).default;

// Import log from general lib
import { log } from './lib.mjs';
import { reportError } from './sentry.lib.mjs';
import { detectUsageLimit, formatUsageLimitMessage } from './usage-limit.lib.mjs';

// Model mapping to translate aliases to full model IDs for Polza AI
// Polza uses OpenAI-compatible format: provider/model-id
export const mapModelToId = (model) => {
  const modelMap = {
    // Claude models via Polza
    'sonnet': 'anthropic/claude-3-5-sonnet-20250219',
    'claude-sonnet': 'anthropic/claude-3-5-sonnet-20250219',
    'sonnet-4': 'anthropic/claude-sonnet-4-20250514',
    'sonnet-4.5': 'anthropic/claude-sonnet-4-5-20250929',
    'opus': 'anthropic/claude-opus-4-20250418',
    'haiku': 'anthropic/claude-3-5-haiku-20250310',

    // OpenAI models via Polza
    'gpt4o': 'openai/gpt-4o',
    'gpt-4o': 'openai/gpt-4o',
    'gpt4': 'openai/gpt-4',
    'gpt-4': 'openai/gpt-4',
    'o1': 'openai/o1',
    'o1-preview': 'openai/o1-preview',

    // DeepSeek models via Polza
    'deepseek-r1': 'deepseek/deepseek-r1',
    'deepseek': 'deepseek/deepseek-chat',

    // Google models via Polza
    'gemini': 'google/gemini-pro',
    'gemini-pro': 'google/gemini-pro'
  };

  // Return mapped model ID if it's an alias, otherwise return as-is
  return modelMap[model] || model;
};

// Function to validate Polza AI connection
export const validatePolzaConnection = async (model = 'sonnet') => {
  await log('🔍 Validating Polza AI connection...');

  // Step 1: Check for POLZA_API_KEY environment variable
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    await log('❌ Polza AI authentication failed', { level: 'error' });
    await log('   💡 POLZA_API_KEY environment variable is not set', { level: 'error' });
    await log('   💡 Please set your Polza API key:', { level: 'error' });
    await log('   💡   export POLZA_API_KEY="your-api-key"', { level: 'error' });
    await log('   💡 Get your API key from: https://polza.ai/', { level: 'error' });
    return false;
  }

  await log('✅ POLZA_API_KEY found');

  // Step 2: Test API connectivity with a simple HTTP request to Polza API
  try {
    await log('🔗 Testing Polza API connectivity...');

    // Map model to proper format
    const mappedModel = mapModelToId(model);

    const response = await fetch('https://api.polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: mappedModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      await log(`❌ Polza API test failed: ${response.status} ${response.statusText}`, { level: 'error' });
      await log(`   Response: ${errorText}`, { level: 'error' });

      if (response.status === 401) {
        await log('   💡 Invalid API key. Please check your POLZA_API_KEY', { level: 'error' });
      } else if (response.status === 402) {
        await log('   💡 Insufficient balance. Please add funds to your Polza account', { level: 'error' });
      } else if (response.status === 400) {
        // Parse error to check if it's about model not found
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.message) {
            await log(`   💡 ${errorData.error.message}`, { level: 'error' });
          }
        } catch {
          // Ignore JSON parse error
        }
      }
      return false;
    }

    const data = await response.json();
    await log('✅ Polza API connection validated successfully');

    if (data.usage && data.usage.cost !== undefined) {
      await log(`   💰 Test request cost: ${data.usage.cost} руб.`);
    }

    return true;
  } catch (error) {
    await log(`❌ Failed to validate Polza API connection: ${error.message}`, { level: 'error' });
    if (error.name === 'AbortError') {
      await log('   💡 Connection timed out. Please check your internet connection', { level: 'error' });
    }
    return false;
  }
};

// Function to handle Polza AI runtime switching (if applicable)
export const handlePolzaRuntimeSwitch = async () => {
  // Polza is accessed via HTTP API, no runtime switching needed
  await log('ℹ️  Polza AI runtime handling not required for this operation');
};

// Main function to execute Polza AI with prompts and settings
export const executePolza = async (params) => {
  const {
    issueUrl,
    issueNumber,
    prNumber,
    prUrl,
    branchName,
    tempDir,
    isContinueMode,
    mergeStateStatus,
    forkedRepo,
    feedbackLines,
    forkActionsUrl,
    owner,
    repo,
    argv,
    log,
    formatAligned,
    getResourceSnapshot,
    $
  } = params;

  // Import prompt building functions from polza.prompts.lib.mjs
  const { buildUserPrompt, buildSystemPrompt } = await import('./polza.prompts.lib.mjs');

  // Build the user prompt
  const prompt = buildUserPrompt({
    issueUrl,
    issueNumber,
    prNumber,
    prUrl,
    branchName,
    tempDir,
    isContinueMode,
    mergeStateStatus,
    forkedRepo,
    feedbackLines,
    forkActionsUrl,
    owner,
    repo,
    argv
  });

  // Build the system prompt
  const systemPrompt = buildSystemPrompt({
    owner,
    repo,
    issueNumber,
    prNumber,
    branchName,
    tempDir,
    isContinueMode,
    forkedRepo,
    argv
  });

  // Log prompt details in verbose mode
  if (argv.verbose) {
    await log('\n📝 Final prompt structure:', { verbose: true });
    await log(`   Characters: ${prompt.length}`, { verbose: true });
    await log(`   System prompt characters: ${systemPrompt.length}`, { verbose: true });
    if (feedbackLines && feedbackLines.length > 0) {
      await log('   Feedback info: Included', { verbose: true });
    }

    if (argv.dryRun) {
      await log('\n📋 User prompt content:', { verbose: true });
      await log('---BEGIN USER PROMPT---', { verbose: true });
      await log(prompt, { verbose: true });
      await log('---END USER PROMPT---', { verbose: true });
      await log('\n📋 System prompt content:', { verbose: true });
      await log('---BEGIN SYSTEM PROMPT---', { verbose: true });
      await log(systemPrompt, { verbose: true });
      await log('---END SYSTEM PROMPT---', { verbose: true });
    }
  }

  // Execute the Polza AI command
  return await executePolzaCommand({
    tempDir,
    branchName,
    prompt,
    systemPrompt,
    argv,
    log,
    formatAligned,
    getResourceSnapshot,
    forkedRepo,
    feedbackLines,
    $
  });
};

export const executePolzaCommand = async (params) => {
  const {
    tempDir,
    branchName,
    prompt,
    systemPrompt,
    argv,
    log,
    formatAligned,
    getResourceSnapshot,
    forkedRepo,
    feedbackLines
  } = params;

  // Execute Polza AI via direct HTTP API calls (OpenAI-compatible)
  await log(`\n${formatAligned('🤖', 'Executing Polza AI:', argv.model.toUpperCase())}`);

  if (argv.verbose) {
    await log(`   Model: ${argv.model}`, { verbose: true });
    await log(`   Working directory: ${tempDir}`, { verbose: true });
    await log(`   Branch: ${branchName}`, { verbose: true });
    await log(`   Prompt length: ${prompt.length} chars`, { verbose: true });
    await log(`   System prompt length: ${systemPrompt.length} chars`, { verbose: true });
    if (feedbackLines && feedbackLines.length > 0) {
      await log(`   Feedback info included: Yes (${feedbackLines.length} lines)`, { verbose: true });
    } else {
      await log('   Feedback info included: No', { verbose: true });
    }
  }

  // Take resource snapshot before execution
  const resourcesBefore = await getResourceSnapshot();
  await log('📈 System resources before execution:', { verbose: true });
  await log(`   Memory: ${resourcesBefore.memory.split('\n')[1]}`, { verbose: true });
  await log(`   Load: ${resourcesBefore.load}`, { verbose: true });

  // Map model alias to full ID
  const mappedModel = mapModelToId(argv.model);

  // Get API key
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    await log('❌ POLZA_API_KEY environment variable is not set', { level: 'error' });
    return {
      success: false,
      sessionId: null,
      limitReached: false,
      limitResetTime: null
    };
  }

  // Build messages array for Polza API
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  await log(`${formatAligned('📋', 'Command details:', '')}`);
  await log(formatAligned('📂', 'Working directory:', tempDir, 2));
  await log(formatAligned('🌿', 'Branch:', branchName, 2));
  await log(formatAligned('🤖', 'Model:', `Polza AI ${mappedModel}`, 2));
  if (argv.fork && forkedRepo) {
    await log(formatAligned('🍴', 'Fork:', forkedRepo, 2));
  }

  await log(`\n${formatAligned('▶️', 'Streaming output:', '')}\n`);

  try {
    // Make streaming request to Polza API
    const response = await fetch('https://api.polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: mappedModel,
        messages,
        stream: true,
        max_tokens: 16000, // Reasonable limit for long responses
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      await log(`❌ Polza API request failed: ${response.status} ${response.statusText}`, { level: 'error' });
      await log(`   Response: ${errorText}`, { level: 'error' });

      if (response.status === 401) {
        await log('   💡 Invalid API key. Please check your POLZA_API_KEY', { level: 'error' });
      } else if (response.status === 402) {
        await log('   💡 Insufficient balance. Please add funds to your Polza account', { level: 'error' });
      }

      const resourcesAfter = await getResourceSnapshot();
      await log('\n📈 System resources after execution:', { verbose: true });
      await log(`   Memory: ${resourcesAfter.memory.split('\n')[1]}`, { verbose: true });
      await log(`   Load: ${resourcesAfter.load}`, { verbose: true });

      return {
        success: false,
        sessionId: null,
        limitReached: false,
        limitResetTime: null
      };
    }

    // Process streaming response
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
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          // Extract content delta
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const delta = parsed.choices[0].delta.content;
            if (delta) {
              fullContent += delta;
              // Stream output to console
              process.stdout.write(delta);
            }
          }

          // Extract usage information
          if (parsed.usage) {
            usage = parsed.usage;
          }
        } catch (err) {
          // Ignore JSON parse errors for malformed chunks
          if (argv.verbose) {
            await log(`   ⚠️  Failed to parse chunk: ${err.message}`, { verbose: true });
          }
        }
      }
    }

    await log('\n\n✅ Polza AI command completed');

    // Display usage information if available
    if (usage) {
      await log(`\n📊 Usage statistics:`);
      await log(`   Total tokens: ${usage.total_tokens}`);
      await log(`   Prompt tokens: ${usage.prompt_tokens}`);
      await log(`   Completion tokens: ${usage.completion_tokens}`);
      if (usage.cost !== undefined) {
        await log(`   💰 Cost: ${usage.cost} руб.`);
      }
    }

    const resourcesAfter = await getResourceSnapshot();
    await log('\n📈 System resources after execution:', { verbose: true });
    await log(`   Memory: ${resourcesAfter.memory.split('\n')[1]}`, { verbose: true });
    await log(`   Load: ${resourcesAfter.load}`, { verbose: true });

    return {
      success: true,
      sessionId: null,
      limitReached: false,
      limitResetTime: null
    };
  } catch (error) {
    reportError(error, {
      context: 'execute_polza',
      model: mappedModel,
      operation: 'api_request'
    });

    await log(`\n\n❌ Error executing Polza AI command: ${error.message}`, { level: 'error' });

    const resourcesAfter = await getResourceSnapshot();
    await log('\n📈 System resources after execution:', { verbose: true });
    await log(`   Memory: ${resourcesAfter.memory.split('\n')[1]}`, { verbose: true });
    await log(`   Load: ${resourcesAfter.load}`, { verbose: true });

    return {
      success: false,
      sessionId: null,
      limitReached: false,
      limitResetTime: null
    };
  }
};

export const checkForUncommittedChanges = async (tempDir, owner, repo, branchName, $, log, autoCommit = false, autoRestartEnabled = true) => {
  // Similar to OpenCode version, check for uncommitted changes
  await log('\n🔍 Checking for uncommitted changes...');
  try {
    const gitStatusResult = await $({ cwd: tempDir })`git status --porcelain 2>&1`;

    if (gitStatusResult.code === 0) {
      const statusOutput = gitStatusResult.stdout.toString().trim();

      if (statusOutput) {
        await log('📝 Found uncommitted changes');
        await log('Changes:');
        for (const line of statusOutput.split('\n')) {
          await log(`   ${line}`);
        }

        if (autoCommit) {
          await log('💾 Auto-committing changes (--auto-commit-uncommitted-changes is enabled)...');

          const addResult = await $({ cwd: tempDir })`git add -A`;
          if (addResult.code === 0) {
            const commitMessage = 'Auto-commit: Changes made by Polza AI during problem-solving session';
            const commitResult = await $({ cwd: tempDir })`git commit -m ${commitMessage}`;

            if (commitResult.code === 0) {
              await log('✅ Changes committed successfully');

              const pushResult = await $({ cwd: tempDir })`git push origin ${branchName}`;

              if (pushResult.code === 0) {
                await log('✅ Changes pushed successfully');
              } else {
                await log(`⚠️ Warning: Could not push changes: ${pushResult.stderr?.toString().trim()}`, { level: 'warning' });
              }
            } else {
              await log(`⚠️ Warning: Could not commit changes: ${commitResult.stderr?.toString().trim()}`, { level: 'warning' });
            }
          } else {
            await log(`⚠️ Warning: Could not stage changes: ${addResult.stderr?.toString().trim()}`, { level: 'warning' });
          }
          return false;
        } else if (autoRestartEnabled) {
          await log('');
          await log('⚠️  IMPORTANT: Uncommitted changes detected!');
          await log('   Polza AI made changes that were not committed.');
          await log('');
          await log('🔄 AUTO-RESTART: Restarting Polza AI to handle uncommitted changes...');
          await log('   Polza AI will review the changes and decide what to commit.');
          await log('');
          return true;
        } else {
          await log('');
          await log('⚠️  Uncommitted changes detected but auto-restart is disabled.');
          await log('   Use --auto-restart-on-uncommitted-changes to enable or commit manually.');
          await log('');
          return false;
        }
      } else {
        await log('✅ No uncommitted changes found');
        return false;
      }
    } else {
      await log(`⚠️ Warning: Could not check git status: ${gitStatusResult.stderr?.toString().trim()}`, { level: 'warning' });
      return false;
    }
  } catch (gitError) {
    reportError(gitError, {
      context: 'check_uncommitted_changes_polza',
      tempDir,
      operation: 'git_status_check'
    });
    await log(`⚠️ Warning: Error checking for uncommitted changes: ${gitError.message}`, { level: 'warning' });
    return false;
  }
};

// Export all functions as default object too
export default {
  validatePolzaConnection,
  handlePolzaRuntimeSwitch,
  executePolza,
  executePolzaCommand,
  checkForUncommittedChanges,
  mapModelToId
};
