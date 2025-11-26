#!/usr/bin/env node

/**
 * Test the fix for hideBin issue (#14)
 * This verifies that solve.config.lib.mjs can properly import and use hideBin
 */

console.log('🔬 Testing the fix for hideBin issue...\n');

// Step 1: Load use-m
console.log('Step 1: Loading use-m');
const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
globalThis.use = use;
console.log('   ✅ use-m loaded\n');

// Step 2: Import solve.config.lib.mjs
console.log('Step 2: Importing solve.config.lib.mjs');
try {
  const config = await import('../hive-mind2/src/solve.config.lib.mjs');
  console.log('   ✅ solve.config.lib.mjs loaded successfully');
  console.log('   Available exports:', Object.keys(config));
} catch (error) {
  console.log('   ❌ Failed to load solve.config.lib.mjs');
  console.log('   Error:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

// Step 3: Test initializeConfig function
console.log('\nStep 3: Testing initializeConfig function');
try {
  const config = await import('../hive-mind2/src/solve.config.lib.mjs');
  const { yargs, hideBin } = await config.initializeConfig(use);
  console.log('   ✅ initializeConfig completed successfully');
  console.log('   yargs type:', typeof yargs);
  console.log('   hideBin type:', typeof hideBin);

  if (typeof hideBin !== 'function') {
    console.log('   ❌ hideBin is not a function!');
    console.log('   hideBin value:', hideBin);
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ initializeConfig failed');
  console.log('   Error:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

// Step 4: Test hideBin functionality
console.log('\nStep 4: Testing hideBin functionality');
try {
  const config = await import('../hive-mind2/src/solve.config.lib.mjs');
  const { hideBin } = await config.initializeConfig(use);

  // Test hideBin with process.argv
  const args = hideBin(process.argv);
  console.log('   ✅ hideBin executed successfully');
  console.log('   Result type:', Array.isArray(args) ? 'array' : typeof args);
  console.log('   Result length:', args.length);
} catch (error) {
  console.log('   ❌ hideBin execution failed');
  console.log('   Error:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

// Step 5: Test parseArguments function
console.log('\nStep 5: Testing parseArguments function');
try {
  const config = await import('../hive-mind2/src/solve.config.lib.mjs');
  const { yargs, hideBin } = await config.initializeConfig(use);

  // Mock process.argv with a test issue URL
  const originalArgv = process.argv;
  process.argv = ['node', 'solve.mjs', 'https://github.com/test/repo/issues/1', '--verbose'];

  const argv = await config.parseArguments(yargs, hideBin);
  console.log('   ✅ parseArguments completed successfully');
  console.log('   Parsed issue-url:', argv['issue-url'] || argv._[0]);
  console.log('   Parsed verbose:', argv.verbose);

  // Restore original argv
  process.argv = originalArgv;
} catch (error) {
  console.log('   ❌ parseArguments failed');
  console.log('   Error:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

console.log('\n✅ All tests passed! The fix is working correctly.');
console.log('\n📝 Summary:');
console.log('   - solve.config.lib.mjs loads successfully');
console.log('   - initializeConfig returns valid yargs and hideBin');
console.log('   - hideBin is a function and works correctly');
console.log('   - parseArguments works with the fixed hideBin');
