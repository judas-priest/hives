#!/usr/bin/env node
/**
 * Debug script to test readline behavior
 */

import readline from 'node:readline';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({
  input,
  output,
  terminal: true,
});

let isClosed = false;

rl.on('close', () => {
  console.log('\n[DEBUG] Readline closed event fired');
  isClosed = true;
});

rl.on('SIGINT', () => {
  console.log('\n[DEBUG] SIGINT received');
});

// Promisify the question method
const question = (prompt) => {
  return new Promise((resolve) => {
    console.log('[DEBUG] Setting up question promise');
    rl.question(prompt, (answer) => {
      console.log('[DEBUG] Question callback fired with:', answer);
      resolve(answer);
    });
  });
};

async function main() {
  console.log('[DEBUG] Starting main loop');

  let iteration = 0;
  while (!isClosed && iteration < 5) {
    iteration++;
    console.log(`[DEBUG] Iteration ${iteration}, isClosed=${isClosed}`);

    try {
      const answer = await question(`[${iteration}] Enter something: `);
      console.log(`[DEBUG] Got answer: "${answer}"`);

      if (!answer.trim()) {
        console.log('[DEBUG] Empty answer, continuing...');
        continue;
      }

      console.log(`You said: ${answer}\n`);

      // Simulate async work (like API call)
      console.log('[DEBUG] Simulating async work...');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[DEBUG] Async work done\n');

    } catch (error) {
      console.log('[DEBUG] Error caught:', error.message);
      break;
    }
  }

  console.log('[DEBUG] Exiting main loop');
  if (!isClosed) {
    rl.close();
  }
  console.log('[DEBUG] Done');
}

main().catch(console.error);
