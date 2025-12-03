/**
 * End-to-End Encryption Module
 *
 * Provides encryption/decryption functionality using the Web Crypto API.
 * Works both in browser and Node.js (v15+).
 *
 * Features:
 * - AES-GCM encryption for message content
 * - RSA-OAEP for key exchange
 * - Secure key generation and storage
 */

/**
 * Generate RSA key pair for asymmetric encryption
 * Used for secure key exchange between peers
 */
export async function generateKeyPair() {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    return keyPair;
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
}

/**
 * Generate symmetric key for message encryption
 * AES-GCM provides both confidentiality and authenticity
 */
export async function generateSymmetricKey() {
  try {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    console.error('Error generating symmetric key:', error);
    throw error;
  }
}

/**
 * Export public key to transferable format
 */
export async function exportPublicKey(publicKey) {
  try {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw error;
  }
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(keyData) {
  try {
    const buffer = base64ToArrayBuffer(keyData);
    const key = await crypto.subtle.importKey(
      'spki',
      buffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['encrypt']
    );

    return key;
  } catch (error) {
    console.error('Error importing public key:', error);
    throw error;
  }
}

/**
 * Export symmetric key to transferable format
 */
export async function exportSymmetricKey(key) {
  try {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error('Error exporting symmetric key:', error);
    throw error;
  }
}

/**
 * Import symmetric key from base64 string
 */
export async function importSymmetricKey(keyData) {
  try {
    const buffer = base64ToArrayBuffer(keyData);
    const key = await crypto.subtle.importKey(
      'raw',
      buffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    console.error('Error importing symmetric key:', error);
    throw error;
  }
}

/**
 * Encrypt message with symmetric key
 */
export async function encryptMessage(message, key) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);

    return arrayBufferToBase64(result);
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw error;
  }
}

/**
 * Decrypt message with symmetric key
 */
export async function decryptMessage(encryptedMessage, key) {
  try {
    const data = base64ToArrayBuffer(encryptedMessage);

    // Extract IV and encrypted data
    const iv = data.slice(0, 12);
    const encryptedData = data.slice(12);

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
}

/**
 * Encrypt symmetric key with public key (for key exchange)
 */
export async function encryptKey(symmetricKey, publicKey) {
  try {
    const keyData = await crypto.subtle.exportKey('raw', symmetricKey);

    const encryptedKey = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      keyData
    );

    return arrayBufferToBase64(encryptedKey);
  } catch (error) {
    console.error('Error encrypting key:', error);
    throw error;
  }
}

/**
 * Decrypt symmetric key with private key
 */
export async function decryptKey(encryptedKey, privateKey) {
  try {
    const encryptedData = base64ToArrayBuffer(encryptedKey);

    const decryptedKey = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedData
    );

    const key = await crypto.subtle.importKey(
      'raw',
      decryptedKey,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    console.error('Error decrypting key:', error);
    throw error;
  }
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Simple demo/test function
 */
export async function testEncryption() {
  console.log('Testing encryption...');

  // Generate keys
  const symmetricKey = await generateSymmetricKey();

  // Encrypt a message
  const originalMessage = 'Hello, this is a secret message!';
  const encrypted = await encryptMessage(originalMessage, symmetricKey);
  console.log('Encrypted:', encrypted.substring(0, 50) + '...');

  // Decrypt the message
  const decrypted = await decryptMessage(encrypted, symmetricKey);
  console.log('Decrypted:', decrypted);

  // Verify
  if (originalMessage === decrypted) {
    console.log('✅ Encryption test passed!');
  } else {
    console.log('❌ Encryption test failed!');
  }
}
