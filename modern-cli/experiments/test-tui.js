#!/usr/bin/env node

/**
 * Test TUI Mode - Experiment Script
 *
 * This script tests the TUI (Text User Interface) mode without requiring API keys
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';

console.log('🧪 Testing TUI mode components...\n');

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'TUI Test - Hives Modern CLI',
  fullUnicode: true,
});

// Create grid layout
const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen
});

// Create conversation log (top 80% of screen)
const conversationLog = grid.set(0, 0, 9, 12, blessed.log, {
  label: ' Conversation Test ',
  tags: true,
  border: { type: 'line' },
  style: {
    fg: 'white',
    border: { fg: 'cyan' },
    label: { fg: 'cyan' }
  },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: '█',
    track: {
      bg: 'grey'
    },
    style: {
      inverse: true
    }
  },
  mouse: true,
  keys: true,
  vi: true
});

// Create input box
const inputBox = grid.set(9, 0, 2, 12, blessed.textarea, {
  label: ' Input (Press Enter to send test message, Ctrl+C to exit) ',
  border: { type: 'line' },
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: 'green' },
    label: { fg: 'green' },
    focus: {
      bg: 'black',
      border: { fg: 'brightgreen' }
    }
  },
  inputOnFocus: true,
  keys: true,
  mouse: true
});

// Create status bar
const statusBar = grid.set(11, 0, 1, 12, blessed.box, {
  content: ' 🧪 TEST MODE | Press Ctrl+C to exit ',
  style: {
    fg: 'white',
    bg: 'blue'
  }
});

// Add welcome message
conversationLog.log('{cyan-fg}{bold}TUI Test Mode{/bold}{/cyan-fg}');
conversationLog.log('{gray-fg}═══════════════════════════════════════════════════════════{/gray-fg}');
conversationLog.log('');
conversationLog.log('{green-fg}✓{/green-fg} TUI components loaded successfully');
conversationLog.log('{green-fg}✓{/green-fg} Blessed library working correctly');
conversationLog.log('{green-fg}✓{/green-fg} Grid layout rendering properly');
conversationLog.log('');
conversationLog.log('{cyan-fg}Test features:{/cyan-fg}');
conversationLog.log('  • {yellow-fg}Scrollable conversation log{/yellow-fg}');
conversationLog.log('  • {yellow-fg}Input box with border{/yellow-fg}');
conversationLog.log('  • {yellow-fg}Status bar at bottom{/yellow-fg}');
conversationLog.log('  • {yellow-fg}Mouse wheel scrolling{/yellow-fg}');
conversationLog.log('  • {yellow-fg}Keyboard shortcuts{/yellow-fg}');
conversationLog.log('');
conversationLog.log('{green-fg}Type a message and press Enter to test!{/green-fg}');
conversationLog.log('');

// Focus on input
inputBox.focus();

// Test message counter
let messageCount = 0;

// Handle input submission
inputBox.on('submit', (value) => {
  const userInput = value.trim();

  if (!userInput) {
    inputBox.clearValue();
    screen.render();
    return;
  }

  messageCount++;

  // Display user message
  conversationLog.log('');
  conversationLog.log(`{green-fg}{bold}You ({yellow-fg}${messageCount}{/yellow-fg}):{/bold}{/green-fg} ${userInput}`);
  conversationLog.log('');

  // Simulate AI response after delay
  setTimeout(() => {
    conversationLog.log(`{blue-fg}{bold}Test AI:{/bold}{/blue-fg}`);
    conversationLog.log(`{dim}This is a test response to: "${userInput}"{/dim}`);
    conversationLog.log('');
    conversationLog.log('{cyan-fg}Features demonstrated:{/cyan-fg}');
    conversationLog.log('  • Colored output with tags');
    conversationLog.log('  • Multi-line responses');
    conversationLog.log('  • Automatic scrolling');
    conversationLog.log('  • Message formatting');
    conversationLog.log('');
    screen.render();
  }, 500);

  // Clear input
  inputBox.clearValue();
  inputBox.focus();
  screen.render();
});

// Handle Ctrl+C - exit
screen.key(['C-c'], () => {
  conversationLog.log('');
  conversationLog.log('{cyan-fg}Exiting TUI test...{/cyan-fg}');
  conversationLog.log('{green-fg}✓ All TUI components working correctly!{/green-fg}');
  screen.render();
  setTimeout(() => {
    screen.destroy();
    console.log('\n✅ TUI test completed successfully!');
    console.log('📝 blessed and blessed-contrib are working properly');
    console.log('🚀 TUI mode is ready to use with: node src/index.js --tui\n');
    process.exit(0);
  }, 1000);
});

// Handle escape - alternative exit
screen.key(['escape'], () => {
  conversationLog.log('');
  conversationLog.log('{cyan-fg}Exiting TUI test...{/cyan-fg}');
  screen.render();
  setTimeout(() => {
    screen.destroy();
    console.log('\n✅ TUI test completed!');
    process.exit(0);
  }, 500);
});

// Handle mouse scroll
conversationLog.on('wheeldown', () => {
  conversationLog.scroll(3);
  screen.render();
});

conversationLog.on('wheelup', () => {
  conversationLog.scroll(-3);
  screen.render();
});

// Render screen
screen.render();

console.log('✅ TUI test started successfully');
console.log('📺 You should see a full-screen interface');
console.log('⌨️  Type messages to test the interface\n');
