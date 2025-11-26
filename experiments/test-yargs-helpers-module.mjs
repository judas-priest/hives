#!/usr/bin/env node

/**
 * Diagnostic script to understand what use('yargs@17.7.2/helpers') returns
 * This helps document why the fix works
 */

console.log('🔬 Investigating yargs/helpers module structure...\n');

// Load use-m
const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
globalThis.use = use;

console.log('Step 1: Import yargs@17.7.2/helpers');
const helpersModule = await use('yargs@17.7.2/helpers');
console.log('   typeof helpersModule:', typeof helpersModule);
console.log('   Is function?:', typeof helpersModule === 'function');
console.log('   Is object?:', typeof helpersModule === 'object');

console.log('\nStep 2: Examine module structure');
if (typeof helpersModule === 'object') {
  console.log('   Object keys:', Object.keys(helpersModule));
  console.log('   Has hideBin property?:', 'hideBin' in helpersModule);
  console.log('   Has default property?:', 'default' in helpersModule);

  if ('hideBin' in helpersModule) {
    console.log('   typeof helpersModule.hideBin:', typeof helpersModule.hideBin);
  }

  if ('default' in helpersModule) {
    console.log('   typeof helpersModule.default:', typeof helpersModule.default);
    if (typeof helpersModule.default === 'object') {
      console.log('   helpersModule.default keys:', Object.keys(helpersModule.default));
    }
  }
}

console.log('\nStep 3: Test different extraction patterns');

// Pattern 1: Direct destructuring (original code - might fail)
console.log('\n   Pattern 1: Direct destructuring');
try {
  const { hideBin } = helpersModule;
  console.log('      ✅ Success');
  console.log('      typeof hideBin:', typeof hideBin);
} catch (error) {
  console.log('      ❌ Failed:', error.message);
}

// Pattern 2: helpersModule.hideBin (first option in fix)
console.log('\n   Pattern 2: helpersModule.hideBin');
try {
  const hideBin = helpersModule.hideBin;
  console.log('      ✅ Success');
  console.log('      typeof hideBin:', typeof hideBin);
  console.log('      Is function?:', typeof hideBin === 'function');
} catch (error) {
  console.log('      ❌ Failed:', error.message);
}

// Pattern 3: helpersModule.default?.hideBin (second option in fix)
console.log('\n   Pattern 3: helpersModule.default?.hideBin');
try {
  const hideBin = helpersModule.default?.hideBin;
  console.log('      ✅ Success');
  console.log('      typeof hideBin:', typeof hideBin);
  console.log('      Is function?:', typeof hideBin === 'function');
} catch (error) {
  console.log('      ❌ Failed:', error.message);
}

// Pattern 4: helpersModule itself (third option in fix)
console.log('\n   Pattern 4: helpersModule (fallback)');
try {
  const hideBin = helpersModule;
  console.log('      ✅ Success');
  console.log('      typeof hideBin:', typeof hideBin);
  console.log('      Is function?:', typeof hideBin === 'function');
} catch (error) {
  console.log('      ❌ Failed:', error.message);
}

// Pattern 5: The fix (combined pattern)
console.log('\n   Pattern 5: Combined pattern (the fix)');
try {
  const hideBin = helpersModule.hideBin || helpersModule.default?.hideBin || helpersModule;
  console.log('      ✅ Success');
  console.log('      typeof hideBin:', typeof hideBin);
  console.log('      Is function?:', typeof hideBin === 'function');

  // Test if it actually works
  const testArgs = hideBin(['node', 'script.js', 'arg1', 'arg2']);
  console.log('      Test execution result:', testArgs);
  console.log('      ✅ Function execution successful');
} catch (error) {
  console.log('      ❌ Failed:', error.message);
}

console.log('\n🔬 Diagnostic complete');
console.log('\n📝 Conclusion:');
console.log('   The fix uses a fallback chain to handle different module formats:');
console.log('   1. helpersModule.hideBin - Direct named export');
console.log('   2. helpersModule.default?.hideBin - Named export within default');
console.log('   3. helpersModule - Module is the function itself');
