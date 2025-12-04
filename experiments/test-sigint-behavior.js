/**
 * Test script to verify SIGINT (Ctrl+C) double-press behavior
 * This simulates the fixed behavior without needing full CLI
 */

import readline from 'node:readline';
import { stdin as input, stdout as output } from 'process';

// Create readline interface
const rl = readline.createInterface({
  input,
  output,
  terminal: true,
});

// Promisify question
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Track SIGINT
let ctrlCCount = 0;
let ctrlCTimeout = null;
let sigintReceived = false;
let isClosed = false;

// Handle close
rl.on('close', () => {
  isClosed = true;
});

// Handle SIGINT
rl.on('SIGINT', () => {
  sigintReceived = true;
  ctrlCCount++;

  if (ctrlCTimeout) {
    clearTimeout(ctrlCTimeout);
  }

  if (ctrlCCount === 1) {
    console.log('\n(To exit, press Ctrl+C again or type /exit)');

    ctrlCTimeout = setTimeout(() => {
      ctrlCCount = 0;
    }, 2000);
  } else if (ctrlCCount >= 2) {
    console.log('\nGoodbye!\n');
    rl.close();
    process.exit(0);
  }
});

// Main loop
console.log('Test SIGINT behavior - Press Ctrl+C once, then again to exit\n');

(async () => {
  while (!isClosed) {
    try {
      const userInput = await question('You > ');

      // Skip if SIGINT was just received
      if (sigintReceived) {
        sigintReceived = false;
        continue;
      }

      if (!userInput.trim()) {
        continue;
      }

      if (userInput.trim() === '/exit') {
        break;
      }

      console.log(`Echo: ${userInput}\n`);
    } catch (error) {
      if (isClosed) {
        break;
      }
      console.error('Error:', error.message);
    }
  }

  if (!isClosed) {
    rl.close();
  }
  console.log('Goodbye!\n');
})();
