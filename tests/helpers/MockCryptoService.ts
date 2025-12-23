/**
 * Mock CryptoService for Testing
 * 
 * Provides simple mock implementations that avoid WebAssembly/argon2-browser issues in Node.js test environments.
 */

export class MockCryptoService {
  /**
   * Mock hash password (returns base64 of password with salt)
   */
  async hashPassword(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: Uint8Array }> {
    const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    const combined = password + Buffer.from(usedSalt).toString('hex');
    const hash = Buffer.from(combined).toString('base64');
    
    return { hash, salt: usedSalt };
  }

  /**
   * Mock verify password (simple string comparison)
   */
  async verifyPassword(password: string, hash: string, salt: Uint8Array): Promise<boolean> {
    const expected = await this.hashPassword(password, salt);
    return expected.hash === hash;
  }

  /**
   * Generate salt (real implementation)
   */
  generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Derive key (simplified for testing)
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Create a mock CryptoKey
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(password + Buffer.from(salt).toString('hex'));
    
    return await crypto.subtle.importKey(
      'raw',
      keyMaterial.slice(0, 32), // Use first 32 bytes
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data (real AES-GCM)
   */
  async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    return {
      encrypted: Buffer.from(encryptedBuffer).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
    };
  }

  /**
   * Decrypt data (real AES-GCM)
   */
  async decrypt(encrypted: string, iv: string, key: CryptoKey): Promise<string> {
    const encryptedBuffer = Buffer.from(encrypted, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Generate random bytes (real implementation)
   */
  generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }
}
