#!/usr/bin/env node

/**
 * Test suite for encryption module
 *
 * Tests E2E encryption functionality:
 * - Key generation
 * - Message encryption/decryption
 * - Key exchange
 */

import * as crypto from '../shared/crypto.js';

console.log('🧪 Testing Encryption Module\n');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  // Test 1: Symmetric key generation
  console.log('📝 Test 1: Symmetric Key Generation');
  try {
    const key = await crypto.generateSymmetricKey();
    assert(key !== null, 'Symmetric key generated successfully');
    assert(key.type === 'secret', 'Key type is "secret"');
    assert(key.algorithm.name === 'AES-GCM', 'Algorithm is AES-GCM');
  } catch (error) {
    assert(false, `Symmetric key generation failed: ${error.message}`);
  }
  console.log('');

  // Test 2: Asymmetric key pair generation
  console.log('📝 Test 2: Asymmetric Key Pair Generation');
  try {
    const keyPair = await crypto.generateKeyPair();
    assert(keyPair.publicKey !== null, 'Public key generated');
    assert(keyPair.privateKey !== null, 'Private key generated');
    assert(keyPair.publicKey.type === 'public', 'Public key type is correct');
    assert(keyPair.privateKey.type === 'private', 'Private key type is correct');
  } catch (error) {
    assert(false, `Key pair generation failed: ${error.message}`);
  }
  console.log('');

  // Test 3: Message encryption and decryption
  console.log('📝 Test 3: Message Encryption & Decryption');
  try {
    const key = await crypto.generateSymmetricKey();
    const originalMessage = 'Hello, this is a test message! 🚀';

    const encrypted = await crypto.encryptMessage(originalMessage, key);
    assert(encrypted !== originalMessage, 'Message was encrypted');
    assert(typeof encrypted === 'string', 'Encrypted message is a string');
    assert(encrypted.length > 0, 'Encrypted message is not empty');

    const decrypted = await crypto.decryptMessage(encrypted, key);
    assert(decrypted === originalMessage, 'Decrypted message matches original');
  } catch (error) {
    assert(false, `Encryption/decryption failed: ${error.message}`);
  }
  console.log('');

  // Test 4: Key export and import
  console.log('📝 Test 4: Key Export & Import');
  try {
    const originalKey = await crypto.generateSymmetricKey();
    const exported = await crypto.exportSymmetricKey(originalKey);
    assert(typeof exported === 'string', 'Exported key is a string');
    assert(exported.length > 0, 'Exported key is not empty');

    const imported = await crypto.importSymmetricKey(exported);
    assert(imported !== null, 'Key imported successfully');
    assert(imported.type === 'secret', 'Imported key type is correct');

    // Test that both keys work the same
    const testMessage = 'Testing key import/export';
    const encrypted = await crypto.encryptMessage(testMessage, originalKey);
    const decrypted = await crypto.decryptMessage(encrypted, imported);
    assert(decrypted === testMessage, 'Imported key works correctly');
  } catch (error) {
    assert(false, `Key export/import failed: ${error.message}`);
  }
  console.log('');

  // Test 5: Public key export and import
  console.log('📝 Test 5: Public Key Export & Import');
  try {
    const keyPair = await crypto.generateKeyPair();
    const exported = await crypto.exportPublicKey(keyPair.publicKey);
    assert(typeof exported === 'string', 'Exported public key is a string');

    const imported = await crypto.importPublicKey(exported);
    assert(imported !== null, 'Public key imported successfully');
    assert(imported.type === 'public', 'Imported key type is correct');
  } catch (error) {
    assert(false, `Public key export/import failed: ${error.message}`);
  }
  console.log('');

  // Test 6: Key encryption (for key exchange)
  console.log('📝 Test 6: Symmetric Key Encryption with Public Key');
  try {
    const keyPair = await crypto.generateKeyPair();
    const symmetricKey = await crypto.generateSymmetricKey();

    const encryptedKey = await crypto.encryptKey(symmetricKey, keyPair.publicKey);
    assert(typeof encryptedKey === 'string', 'Encrypted key is a string');
    assert(encryptedKey.length > 0, 'Encrypted key is not empty');

    const decryptedKey = await crypto.decryptKey(encryptedKey, keyPair.privateKey);
    assert(decryptedKey !== null, 'Key decrypted successfully');

    // Test that decrypted key works
    const testMessage = 'Testing key exchange';
    const encrypted = await crypto.encryptMessage(testMessage, symmetricKey);
    const decrypted = await crypto.decryptMessage(encrypted, decryptedKey);
    assert(decrypted === testMessage, 'Decrypted key works correctly');
  } catch (error) {
    assert(false, `Key encryption failed: ${error.message}`);
  }
  console.log('');

  // Test 7: Unicode and special characters
  console.log('📝 Test 7: Unicode & Special Characters');
  try {
    const key = await crypto.generateSymmetricKey();
    const messages = [
      'Hello 世界! 🌍',
      'Тест кириллицы',
      'مرحبا بالعالم',
      'こんにちは世界',
      '!@#$%^&*()_+-=[]{}|;:",.<>?/~`'
    ];

    for (const msg of messages) {
      const encrypted = await crypto.encryptMessage(msg, key);
      const decrypted = await crypto.decryptMessage(encrypted, key);
      assert(decrypted === msg, `Unicode message preserved: "${msg.substring(0, 20)}..."`);
    }
  } catch (error) {
    assert(false, `Unicode handling failed: ${error.message}`);
  }
  console.log('');

  // Test 8: Long message handling
  console.log('📝 Test 8: Long Message Handling');
  try {
    const key = await crypto.generateSymmetricKey();
    const longMessage = 'A'.repeat(10000); // 10KB message

    const encrypted = await crypto.encryptMessage(longMessage, key);
    const decrypted = await crypto.decryptMessage(encrypted, key);
    assert(decrypted === longMessage, 'Long message encrypted and decrypted correctly');
    assert(decrypted.length === 10000, 'Message length preserved');
  } catch (error) {
    assert(false, `Long message handling failed: ${error.message}`);
  }
  console.log('');

  // Print summary
  console.log('═'.repeat(50));
  console.log('📊 Test Summary');
  console.log('═'.repeat(50));
  console.log(`Total tests:  ${testsRun}`);
  console.log(`Passed:       ${testsPassed} ✅`);
  console.log(`Failed:       ${testsFailed} ❌`);
  console.log(`Success rate: ${Math.round((testsPassed / testsRun) * 100)}%`);
  console.log('═'.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed!\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
