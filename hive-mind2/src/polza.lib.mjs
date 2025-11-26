#!/usr/bin/env node
// Polza AI-related utility functions

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
import { timeouts } from './config.lib.mjs';
import { detectUsageLimit, formatUsageLimitMessage } from './usage-limit.lib.mjs';

// Model mapping to translate aliases to full model IDs for Polza AI
// The agent CLI expects format: polza/provider/model-id
export const mapModelToId = (model) => {
  const modelMap = {
    // Claude models via Polza
    'sonnet': 'polza/anthropic/claude-3-5-sonnet-20250219',
    'claude-sonnet': 'polza/anthropic/claude-3-5-sonnet-20250219',
    'sonnet-4': 'polza/anthropic/claude-sonnet-4-20250514',
    'sonnet-4.5': 'polza/anthropic/claude-sonnet-4-5-20250929',
    'opus': 'polza/anthropic/claude-opus-4-20250418',
    'haiku': 'polza/anthropic/claude-3-5-haiku-20250310',

    // OpenAI models via Polza
    'gpt4o': 'polza/openai/gpt-4o',
    'gpt-4o': 'polza/openai/gpt-4o',
    'gpt4': 'polza/openai/gpt-4',
    'gpt-4': 'polza/openai/gpt-4',
    'o1': 'polza/openai/o1',
    'o1-preview': 'polza/openai/o1-preview',

    // DeepSeek models via Polza
    'deepseek-r1': 'polza/deepseek/deepseek-r1',
    'deepseek': 'polza/deepseek/deepseek-chat',

    // Google models via Polza
    'gemini': 'polza/google/gemini-pro',
    'gemini-pro': 'polza/google/gemini-pro'
  };

  // If the model already has polza/ prefix, return as-is
  if (model.startsWith('polza/')) {
    return model;
  }

  // Return mapped model ID if it's an alias, otherwise prepend polza/ prefix
  return modelMap[model] || `polza/${model}`;
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

  // Step 2: Check if Bun is installed (required for agent CLI)
  try {
    const bunCheckResult = await $`which bun`;
    if (bunCheckResult.code !== 0) {
      await log('❌ Bun runtime not found', { level: 'error' });
      await log('   💡 Polza integration requires Bun to be installed', { level: 'error' });
      await log('   💡 Install Bun: curl -fsSL https://bun.sh/install | bash', { level: 'error' });
      await log('   💡 Or visit: https://bun.sh/', { level: 'error' });
      return false;
    }
    const bunPath = bunCheckResult.stdout?.toString().trim();
    await log(`📦 Bun runtime found: ${bunPath}`);
  } catch (error) {
    await log('❌ Error checking for Bun runtime', { level: 'error' });
    await log(`   ${error.message}`, { level: 'error' });
    return false;
  }

  // Step 3: Check if @deep-assistant/agent is installed
  try {
    const agentCheckResult = await $`which agent`;
    if (agentCheckResult.code !== 0) {
      await log('❌ Agent CLI not found', { level: 'error' });
      await log('   💡 Please install @deep-assistant/agent:', { level: 'error' });
      await log('   💡   bun install -g @deep-assistant/agent', { level: 'error' });
      return false;
    }
    const agentPath = agentCheckResult.stdout?.toString().trim();
    await log(`📦 Agent CLI found: ${agentPath}`);
  } catch (error) {
    await log('❌ Error checking for Agent CLI', { level: 'error' });
    await log(`   ${error.message}`, { level: 'error' });
    return false;
  }

  // Step 4: Get agent version
  try {
    const versionResult = await $`agent --version`;
    if (versionResult.code === 0) {
      const version = versionResult.stdout?.toString().trim();
      await log(`📦 Polza Agent CLI version: ${version}`);
    }
  } catch (versionError) {
    await log(`⚠️  Could not get agent version, but proceeding with validation...`);
  }

  // Step 5: Test API connectivity with a simple HTTP request to Polza API
  // This is faster and more reliable than running the full agent CLI
  try {
    await log('🔗 Testing Polza API connectivity...');

    const response = await fetch('https://api.polza.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-5-sonnet-20250219',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      await log(`❌ Polza API test failed: ${response.status} ${response.statusText}`, { level: 'error' });
      await log(`   Response: ${errorText}`, { level: 'error' });

      if (response.status === 401) {
        await log('   💡 Invalid API key. Please check your POLZA_API_KEY', { level: 'error' });
      } else if (response.status === 402) {
        await log('   💡 Insufficient balance. Please add funds to your Polza account', { level: 'error' });
      }
      return false;
    }

    const data = await response.json();
    await log('✅ Polza API connection validated successfully');

    if (data.usage && data.usage.cost) {
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
  // Polza is run as a CLI tool, runtime switching may not be applicable
  // This function can be used for any runtime-specific configurations if needed
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
    polzaPath = 'agent',
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
    polzaPath,
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
    feedbackLines,
    polzaPath,
    $
  } = params;

  // Retry configuration
  const maxRetries = 3;
  let retryCount = 0;

  const executeWithRetry = async () => {
    // Execute agent command from the cloned repository directory
    if (retryCount === 0) {
      await log(`\n${formatAligned('🤖', 'Executing Polza AI:', argv.model.toUpperCase())}`);
    } else {
      await log(`\n${formatAligned('🔄', 'Retry attempt:', `${retryCount}/${maxRetries}`)}`);
    }

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

    // Build Polza AI command
    let execCommand;

    // Map model alias to full ID
    const mappedModel = mapModelToId(argv.model);

    // Build agent command arguments
    let agentArgs = `--model ${mappedModel}`;

    if (argv.resume) {
      await log(`🔄 Resuming from session: ${argv.resume}`);
      // Note: Check if agent supports resume flag, add if it does
      agentArgs = `--model ${mappedModel}`;
      await log(`⚠️  Warning: Resume functionality may not be supported by Polza Agent`, { level: 'warning' });
    }

    // For Polza AI agent, we pass the combined prompt via stdin
    // We need to combine system and user prompts into a single message
    const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    // If there's a system prompt, we can use --append-system-message flag
    // Write the prompts to files for piping
    // Use OS temporary directory instead of repository workspace to avoid polluting the repo
    const promptFile = path.join(os.tmpdir(), `polza_prompt_${Date.now()}_${process.pid}.txt`);
    const systemPromptFile = systemPrompt ? path.join(os.tmpdir(), `polza_system_${Date.now()}_${process.pid}.txt`) : null;

    await fs.writeFile(promptFile, prompt);
    if (systemPromptFile) {
      await fs.writeFile(systemPromptFile, systemPrompt);
      agentArgs += ` --append-system-message-file ${systemPromptFile}`;
    }

    // Build the full command - pipe the prompt file to agent
    const fullCommand = `(cd "${tempDir}" && cat "${promptFile}" | ${polzaPath} ${agentArgs})`;

    await log(`\n${formatAligned('📝', 'Raw command:', '')}`);
    await log(`${fullCommand}`);
    await log('');

    try {
      // Pipe the prompt file to agent via stdin
      if (systemPromptFile) {
        execCommand = $({
          cwd: tempDir,
          mirror: false
        })`cat ${promptFile} | ${polzaPath} --model ${mappedModel} --append-system-message-file ${systemPromptFile}`;
      } else {
        execCommand = $({
          cwd: tempDir,
          mirror: false
        })`cat ${promptFile} | ${polzaPath} --model ${mappedModel}`;
      }

      await log(`${formatAligned('📋', 'Command details:', '')}`);
      await log(formatAligned('📂', 'Working directory:', tempDir, 2));
      await log(formatAligned('🌿', 'Branch:', branchName, 2));
      await log(formatAligned('🤖', 'Model:', `Polza AI ${argv.model.toUpperCase()}`, 2));
      if (argv.fork && forkedRepo) {
        await log(formatAligned('🍴', 'Fork:', forkedRepo, 2));
      }

      await log(`\n${formatAligned('▶️', 'Streaming output:', '')}\n`);

      let exitCode = 0;
      let sessionId = null;
      let limitReached = false;
      let limitResetTime = null;
      let lastMessage = '';

      for await (const chunk of execCommand.stream()) {
        if (chunk.type === 'stdout') {
          const output = chunk.data.toString();
          await log(output);
          lastMessage = output;
        }

        if (chunk.type === 'stderr') {
          const errorOutput = chunk.data.toString();
          if (errorOutput) {
            await log(errorOutput, { stream: 'stderr' });
          }
        } else if (chunk.type === 'exit') {
          exitCode = chunk.code;
        }
      }

      // Clean up temporary files
      try {
        await fs.unlink(promptFile);
        if (systemPromptFile) {
          await fs.unlink(systemPromptFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      if (exitCode !== 0) {
        // Check for usage limit errors first (more specific)
        const limitInfo = detectUsageLimit(lastMessage);
        if (limitInfo.isUsageLimit) {
          limitReached = true;
          limitResetTime = limitInfo.resetTime;

          // Format and display user-friendly message
          const messageLines = formatUsageLimitMessage({
            tool: 'Polza AI',
            resetTime: limitInfo.resetTime,
            sessionId,
            resumeCommand: sessionId ? `${process.argv[0]} ${process.argv[1]} ${argv.url} --resume ${sessionId}` : null
          });

          for (const line of messageLines) {
            await log(line, { level: 'warning' });
          }
        } else {
          await log(`\n\n❌ Polza AI command failed with exit code ${exitCode}`, { level: 'error' });
        }

        const resourcesAfter = await getResourceSnapshot();
        await log('\n📈 System resources after execution:', { verbose: true });
        await log(`   Memory: ${resourcesAfter.memory.split('\n')[1]}`, { verbose: true });
        await log(`   Load: ${resourcesAfter.load}`, { verbose: true });

        return {
          success: false,
          sessionId,
          limitReached,
          limitResetTime
        };
      }

      await log('\n\n✅ Polza AI command completed');

      return {
        success: true,
        sessionId,
        limitReached,
        limitResetTime
      };
    } catch (error) {
      reportError(error, {
        context: 'execute_polza',
        command: params.command,
        polzaPath: params.polzaPath,
        operation: 'run_polza_command'
      });

      await log(`\n\n❌ Error executing Polza AI command: ${error.message}`, { level: 'error' });
      return {
        success: false,
        sessionId: null,
        limitReached: false,
        limitResetTime: null
      };
    }
  };

  // Start the execution with retry logic
  return await executeWithRetry();
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
