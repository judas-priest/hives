#!/usr/bin/env node

/**
 * Experiment to simulate the exact scenario from the error
 * This mimics importing config.lib.mjs when globalThis.use is already defined
 * but might have issues
 */

console.log('🔬 Testing actual scenario from the error...\n');

// First, let's set up globalThis.use INCORRECTLY (like might happen in some scenarios)
console.log('Step 1: Setting up a potentially problematic globalThis.use');
globalThis.use = async (moduleName) => {
  console.log('   ⚠️  Mock use() called with:', moduleName);
  // Return something that's not what's expected
  return { notAFunction: true };
};

console.log('\nStep 2: Now import config.lib.mjs');
try {
  const config = await import('../hive-mind2/src/config.lib.mjs');
  console.log('✅ Config loaded successfully');
} catch (error) {
  console.log('❌ Error caught:', error.message);
  console.log('   Error at:', error.stack.split('\n')[1]);
}

console.log('\n🔬 Test complete');
