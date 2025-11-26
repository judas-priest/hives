#!/usr/bin/env node

/**
 * Experiment to understand what use('getenv') returns
 */

console.log('🔬 Testing what use("getenv") returns...\n');

// Load use-m
const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
globalThis.use = use;

console.log('Step 1: Call use("getenv")');
const getenvResult = await use('getenv');
console.log('   typeof getenvResult:', typeof getenvResult);
console.log('   getenvResult:', getenvResult);
console.log('   getenvResult.default:', getenvResult.default);
console.log('   typeof getenvResult.default:', typeof getenvResult.default);

console.log('\nStep 2: Try to use getenvResult as a function');
try {
  const value = getenvResult('TEST_VAR', 'default_value');
  console.log('   ✅ Direct call worked:', value);
} catch (error) {
  console.log('   ❌ Direct call failed:', error.message);
}

console.log('\nStep 3: Try to use getenvResult.default as a function');
try {
  const value = getenvResult.default('TEST_VAR', 'default_value');
  console.log('   ✅ .default call worked:', value);
} catch (error) {
  console.log('   ❌ .default call failed:', error.message);
}

console.log('\n🔬 Test complete');
