#!/usr/bin/env node

/**
 * Test the fix for getenv issue
 */

console.log('🔬 Testing the fix for getenv issue...\n');

console.log('Step 1: Import config.lib.mjs');
try {
  const config = await import('../hive-mind2/src/config.lib.mjs');
  console.log('✅ Config loaded successfully');
  console.log('   timeouts.claudeCli =', config.timeouts.claudeCli);
  console.log('   githubLimits.commentMaxSize =', config.githubLimits.commentMaxSize);
  console.log('   modelConfig.defaultModel =', config.modelConfig.defaultModel);
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}

console.log('\n✅ All tests passed!');
