#!/usr/bin/env node

/**
 * Test URL construction to understand the bug
 */

// Current (broken) way
const baseUrl1 = 'https://api.polza.ai/api/v1';
const url1 = new URL('/chat/completions', baseUrl1);
console.log('❌ Current (broken) way:');
console.log('   Base:', baseUrl1);
console.log('   Result:', url1.href);
console.log('   Expected: https://api.polza.ai/api/v1/chat/completions');
console.log();

// Fixed way (no leading slash)
const baseUrl2 = 'https://api.polza.ai/api/v1';
const url2 = new URL('chat/completions', baseUrl2);
console.log('✅ Fixed way (no leading slash):');
console.log('   Base:', baseUrl2);
console.log('   Result:', url2.href);
console.log();

// Alternative: ensure base ends with slash
const baseUrl3 = 'https://api.polza.ai/api/v1/';
const url3 = new URL('chat/completions', baseUrl3);
console.log('✅ Alternative (base ends with slash):');
console.log('   Base:', baseUrl3);
console.log('   Result:', url3.href);
console.log();

// Using path.join approach
const baseUrl4 = 'https://api.polza.ai/api/v1';
const url4 = new URL(baseUrl4 + '/chat/completions');
console.log('✅ Using string concatenation:');
console.log('   Base:', baseUrl4);
console.log('   Result:', url4.href);
