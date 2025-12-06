/**
 * Test script for new UI elements - contour lines and progress bars
 */

import chalk from 'chalk';
import {
  createContourLine,
  createProgressBar,
  createAnimatedProgressBar,
  createContourBox,
  createSeparator,
  createDivider,
  CHARS,
} from '../src/ui/elements.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUIElements() {
  console.log(chalk.bold.cyan('\n🎨 Testing Modern UI Elements\n'));

  // Test 1: Contour Lines
  console.log(chalk.bold('1. Contour Lines:'));
  console.log('   ' + createContourLine(50, 'cyan', true, 'bottom-left'));
  console.log('   ' + createContourLine(50, 'magenta', true, 'top-left'));
  console.log('   ' + createContourLine(50, 'yellow', false));
  console.log();

  // Test 2: Dividers
  console.log(chalk.bold('2. Dividers:'));
  console.log('   ' + createDivider('cyan'));
  console.log('   ' + createDivider('gray'));
  console.log('   ' + createDivider('green'));
  console.log();

  // Test 3: Separators with text
  console.log(chalk.bold('3. Separators with Text:'));
  console.log('   ' + createSeparator('Section 1', 60, 'cyan'));
  console.log('   ' + createSeparator('Important Note', 60, 'yellow'));
  console.log('   ' + createSeparator('', 60, 'gray'));
  console.log();

  // Test 4: Static Progress Bars
  console.log(chalk.bold('4. Static Progress Bars (pip style):'));
  console.log('   ' + createProgressBar(0, 40, { color: 'cyan' }));
  console.log('   ' + createProgressBar(25, 40, { color: 'cyan' }));
  console.log('   ' + createProgressBar(50, 40, { color: 'green' }));
  console.log('   ' + createProgressBar(75, 40, { color: 'yellow' }));
  console.log('   ' + createProgressBar(100, 40, { color: 'green' }));
  console.log();

  // Test 5: Animated Progress Bar
  console.log(chalk.bold('5. Animated Progress Bar:'));
  const progressBar = createAnimatedProgressBar({
    width: 40,
    color: 'cyan',
    text: 'Processing',
    stream: process.stdout,
  });

  for (let i = 0; i <= 100; i += 5) {
    progressBar.update(i, i < 50 ? 'Loading...' : 'Almost there...');
    await sleep(100);
  }
  progressBar.succeed('Complete!');
  console.log();

  // Test 6: Contour Box
  console.log(chalk.bold('6. Contour Box:'));
  const boxContent = 'This is a beautiful box\nwith multiple lines\nand cool borders!';
  console.log(createContourBox(boxContent, {
    width: 50,
    color: 'cyan',
    padding: 2,
    title: 'Example Box',
  }));
  console.log();

  // Test 7: Unicode Characters Reference
  console.log(chalk.bold('7. Available Unicode Characters:'));
  console.log(`   Corners: ${CHARS.topLeft} ${CHARS.topRight} ${CHARS.bottomLeft} ${CHARS.bottomRight}`);
  console.log(`   Lines: ${CHARS.horizontal} ${CHARS.vertical}`);
  console.log(`   T-junctions: ${CHARS.tDown} ${CHARS.tUp} ${CHARS.tRight} ${CHARS.tLeft}`);
  console.log(`   Progress: ${CHARS.filled} ${CHARS.empty} ${CHARS.partial.join(' ')}`);
  console.log();

  // Test 8: Real-world usage example
  console.log(chalk.bold('8. Real-world Usage Example:\n'));
  console.log('   ' + createDivider('cyan'));
  console.log(chalk.blue.bold('   Assistant > '));
  console.log('   This is how it looks in the actual CLI!');
  console.log();
  console.log('   ' + createSeparator('End of Response', 60, 'gray'));
  console.log();

  console.log(chalk.green.bold('✓ All UI elements tested successfully!\n'));
}

// Run tests
testUIElements().catch(console.error);
