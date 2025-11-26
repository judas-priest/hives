#!/usr/bin/env node

/**
 * Experiment to reproduce the 'getenv is not a function' error
 *
 * This test demonstrates the issue where config.lib.mjs is imported
 * before globalThis.use is set up, causing getenv to be undefined.
 */

console.log('🔬 Testing getenv initialization order issue...\n');

// Simulate what happens in instrument.mjs (which runs before globalThis.use is set up)
console.log('Step 1: Importing config.lib.mjs BEFORE globalThis.use is set up');
console.log('        (This is what happens in instrument.mjs:46)');

try {
  const config = await import('../hive-mind2/src/config.lib.mjs');
  console.log('✅ Config loaded successfully');
  console.log('   timeouts.claudeCli =', config.timeouts.claudeCli);
} catch (error) {
  console.log('❌ Error caught:', error.message);
  console.log('   Error stack:', error.stack);
}

console.log('\n🔬 Test complete');
