/**
 * CryptoService Data Decryption Tests
 * 
 * Tests for AES-256-GCM data decryption functionality
 * Covers: decryptData method
 * 
 * Security Requirements:
 * - OWASP ASVS 4.0: 6.2.1, 6.2.2, 6.2.3
 * - NIST SP 800-38D: AES-GCM mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService, CryptoError, CryptoErrorCode } from '../../../src/services/CryptoService';

describe('CryptoService - Data Decryption', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  // ==========================================================================
  // Basic Decryption Tests
  // ==========================================================================

  describe('decryptData()', () => {
    it('should decrypt simple string data', async () => {
      const originalData = 'Hello, World!';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toBe(originalData);
    });

    it('should decrypt object data', async () => {
      const originalData = {
        username: 'testuser',
        password: 'secret123',
        notes: 'This is a test account',
      };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('master_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt array data', async () => {
      const originalData = ['item1', 'item2', 'item3'];
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('password123', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt number data', async () => {
      const originalData = 42;
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toBe(originalData);
    });

    it('should decrypt boolean data', async () => {
      const originalData = true;
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toBe(originalData);
    });

    it('should decrypt empty string', async () => {
      const originalData = '';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toBe(originalData);
    });

    it('should decrypt empty object', async () => {
      const originalData = {};
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt empty array', async () => {
      const originalData: any[] = [];
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt large data', async () => {
      const originalData = {
        field1: 'x'.repeat(1000),
        field2: 'y'.repeat(1000),
        nested: {
          deep: {
            value: 'z'.repeat(1000),
          },
        },
      };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should decrypt complex nested object', async () => {
      const originalData = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep nested value',
                array: [1, 2, 3],
                bool: true,
              },
            },
          },
        },
      };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });
  });

  // ==========================================================================
  // Round-trip Tests (encrypt then decrypt)
  // ==========================================================================

  describe('Round-trip Encryption/Decryption', () => {
    it('should preserve data type through round-trip', async () => {
      const testCases = [
        'string',
        123,
        true,
        false,
        null,
        { key: 'value' },
        [1, 2, 3],
        { nested: { object: 'value' } },
      ];

      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      for (const testData of testCases) {
        const encrypted = await cryptoService.encryptData(testData, key, { salt });
        const decrypted = await cryptoService.decryptData(encrypted, key);

        expect(decrypted).toEqual(testData);
      }
    });

    it('should preserve special characters', async () => {
      const originalData = {
        unicode: '你好世界',
        emoji: '🔐🔑🛡️',
        special: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/',
        newlines: 'line1\nline2\nline3',
        tabs: 'col1\tcol2\tcol3',
      };

      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should preserve object key order', async () => {
      const originalData = {
        z: 'last',
        a: 'first',
        m: 'middle',
      };

      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(Object.keys(decrypted)).toEqual(Object.keys(originalData));
    });

    it('should handle multiple round-trips', async () => {
      let data = { value: 'original' };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      // Encrypt and decrypt 5 times
      for (let i = 0; i < 5; i++) {
        const encrypted = await cryptoService.encryptData(data, key, { salt });
        data = await cryptoService.decryptData(encrypted, key);
      }

      expect(data).toEqual({ value: 'original' });
    });
  });

  // ==========================================================================
  // Security Property Tests
  // ==========================================================================

  describe('Security Properties', () => {
    it('should fail decryption with wrong key', async () => {
      const originalData = 'Secret data';
      const salt1 = cryptoService.generateSalt();
      const salt2 = cryptoService.generateSalt();
      const key1 = await cryptoService.deriveEncryptionKey('password1', salt1);
      const key2 = await cryptoService.deriveEncryptionKey('password2', salt2);

      const encrypted = await cryptoService.encryptData(originalData, key1, { salt: salt1 });

      await expect(
        cryptoService.decryptData(encrypted, key2)
      ).rejects.toThrow(CryptoError);
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const originalData = 'Secret data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -4) + 'XXXX';
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

      await expect(
        cryptoService.decryptData(tampered, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should fail decryption with tampered IV', async () => {
      const originalData = 'Secret data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      // Tamper with IV
      const tamperedIV = encrypted.iv.slice(0, -4) + 'XXXX';
      const tampered = { ...encrypted, iv: tamperedIV };

      await expect(
        cryptoService.decryptData(tampered, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should fail decryption when any byte is modified', async () => {
      const originalData = 'Secret data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      // Modify a single character in the middle
      const mid = Math.floor(encrypted.ciphertext.length / 2);
      const tamperedCiphertext = 
        encrypted.ciphertext.slice(0, mid) + 
        'X' + 
        encrypted.ciphertext.slice(mid + 1);
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

      await expect(
        cryptoService.decryptData(tampered, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should detect bit-flip attacks', async () => {
      const originalData = { admin: false };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      // Try to flip a bit by replacing a character
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -1) + 
        (encrypted.ciphertext.slice(-1) === 'A' ? 'B' : 'A');
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

      // GCM mode should detect the modification
      await expect(
        cryptoService.decryptData(tampered, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw DECRYPTION_FAILED error for tampered data', async () => {
      const originalData = 'Secret data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const tampered = { ...encrypted, ciphertext: 'invalid_base64!' };

      try {
        await cryptoService.decryptData(tampered, key);
        expect.fail('Should have thrown CryptoError');
      } catch (error) {
        expect(error).toBeInstanceOf(CryptoError);
        expect((error as CryptoError).code).toBe(CryptoErrorCode.DECRYPTION_FAILED);
      }
    });
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================

  describe('Input Validation', () => {
    it('should reject null encrypted data', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData(null as any, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject undefined encrypted data', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData(undefined as any, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject encrypted data without ciphertext', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData({ iv: 'test', salt: 'test' } as any, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject encrypted data without IV', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData({ ciphertext: 'test', salt: 'test' } as any, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject empty ciphertext', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData({ ciphertext: '', iv: 'test', salt: 'test' }, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject empty IV', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData({ ciphertext: 'test', iv: '', salt: 'test' }, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject invalid key (null)', async () => {
      const originalData = 'Test data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      await expect(
        cryptoService.decryptData(encrypted, null as any)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject invalid key (undefined)', async () => {
      const originalData = 'Test data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      await expect(
        cryptoService.decryptData(encrypted, undefined as any)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject invalid key (not CryptoKey)', async () => {
      const originalData = 'Test data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      await expect(
        cryptoService.decryptData(encrypted, 'not a crypto key' as any)
      ).rejects.toThrow(CryptoError);
    });

    it('should reject invalid base64 in ciphertext', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData(
          { ciphertext: 'not!base64!', iv: 'dGVzdA==', salt: 'dGVzdA==' },
          key
        )
      ).rejects.toThrow(CryptoError);
    });

    it('should reject invalid base64 in IV', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      await expect(
        cryptoService.decryptData(
          { ciphertext: 'dGVzdA==', iv: 'not!base64!', salt: 'dGVzdA==' },
          key
        )
      ).rejects.toThrow(CryptoError);
    });

    it('should reject IV with wrong length', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      // Create IV with wrong length (8 bytes instead of 12)
      const shortIV = 'dGVzdA=='; // 4 bytes base64

      await expect(
        cryptoService.decryptData(
          { ciphertext: 'dGVzdA==', iv: shortIV, salt: 'dGVzdHRlc3R0ZXN0dGVzdHRlc3R0ZXN0dGVzdA==' },
          key
        )
      ).rejects.toThrow(CryptoError);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw CryptoError with INVALID_INPUT for null data', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      try {
        await cryptoService.decryptData(null as any, key);
        expect.fail('Should have thrown CryptoError');
      } catch (error) {
        expect(error).toBeInstanceOf(CryptoError);
        expect((error as CryptoError).code).toBe(CryptoErrorCode.INVALID_INPUT);
      }
    });

    it('should throw CryptoError with INVALID_INPUT for invalid key', async () => {
      const originalData = 'Test data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      try {
        await cryptoService.decryptData(encrypted, null as any);
        expect.fail('Should have thrown CryptoError');
      } catch (error) {
        expect(error).toBeInstanceOf(CryptoError);
        expect((error as CryptoError).code).toBe(CryptoErrorCode.INVALID_INPUT);
      }
    });

    it('should throw CryptoError with DECRYPTION_FAILED for wrong key', async () => {
      const originalData = 'Secret data';
      const salt1 = cryptoService.generateSalt();
      const salt2 = cryptoService.generateSalt();
      const key1 = await cryptoService.deriveEncryptionKey('password1', salt1);
      const key2 = await cryptoService.deriveEncryptionKey('password2', salt2);

      const encrypted = await cryptoService.encryptData(originalData, key1, { salt: salt1 });

      try {
        await cryptoService.decryptData(encrypted, key2);
        expect.fail('Should have thrown CryptoError');
      } catch (error) {
        expect(error).toBeInstanceOf(CryptoError);
        expect((error as CryptoError).code).toBe(CryptoErrorCode.DECRYPTION_FAILED);
      }
    });

    it('should include descriptive error message for tampered data', async () => {
      const originalData = 'Secret data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });
      const tampered = { ...encrypted, ciphertext: encrypted.ciphertext + 'XXX' };

      try {
        await cryptoService.decryptData(tampered, key);
        expect.fail('Should have thrown CryptoError');
      } catch (error) {
        expect(error).toBeInstanceOf(CryptoError);
        expect((error as CryptoError).message).toContain('decrypt');
      }
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should decrypt small data quickly (< 50ms)', async () => {
      const originalData = 'Small data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      const start = performance.now();
      await cryptoService.decryptData(encrypted, key);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should decrypt medium data efficiently (< 100ms)', async () => {
      const originalData = {
        field1: 'x'.repeat(1000),
        field2: 'y'.repeat(1000),
        field3: 'z'.repeat(1000),
      };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      const start = performance.now();
      await cryptoService.decryptData(encrypted, key);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple decryptions efficiently', async () => {
      const originalData = 'Test data';
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      // Encrypt once
      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      const start = performance.now();
      
      // Decrypt 10 times
      const promises = Array(10).fill(null).map(() =>
        cryptoService.decryptData(encrypted, key)
      );
      
      await Promise.all(promises);
      const duration = performance.now() - start;

      // 10 decryptions should complete quickly
      expect(duration).toBeLessThan(300);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should work in full encryption/decryption workflow', async () => {
      const masterPassword = 'my_master_password';
      const sensitiveData = {
        username: 'user@example.com',
        password: 'super_secret_123',
        notes: 'Very sensitive information',
      };

      // Full workflow: generate salt → derive key → encrypt → decrypt
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);
      const encrypted = await cryptoService.encryptData(sensitiveData, key, { salt });
      const decrypted = await cryptoService.decryptData(encrypted, key);

      expect(decrypted).toEqual(sensitiveData);
    });

    it('should work with stored and retrieved encrypted data', async () => {
      const originalData = { secret: 'information' };
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('password', salt);

      const encrypted = await cryptoService.encryptData(originalData, key, { salt });

      // Simulate storage: serialize and deserialize
      const stored = JSON.stringify(encrypted);
      const retrieved = JSON.parse(stored);

      // Decrypt retrieved data
      const decrypted = await cryptoService.decryptData(retrieved, key);

      expect(decrypted).toEqual(originalData);
    });

    it('should maintain data integrity across multiple operations', async () => {
      const salt = cryptoService.generateSalt();
      const key = await cryptoService.deriveEncryptionKey('test_password', salt);

      // Encrypt multiple pieces of data
      const data1 = { id: 1, value: 'Data 1' };
      const data2 = { id: 2, value: 'Data 2' };
      const data3 = { id: 3, value: 'Data 3' };

      const encrypted1 = await cryptoService.encryptData(data1, key, { salt });
      const encrypted2 = await cryptoService.encryptData(data2, key, { salt });
      const encrypted3 = await cryptoService.encryptData(data3, key, { salt });

      // Decrypt all
      const decrypted1 = await cryptoService.decryptData(encrypted1, key);
      const decrypted2 = await cryptoService.decryptData(encrypted2, key);
      const decrypted3 = await cryptoService.decryptData(encrypted3, key);

      expect(decrypted1).toEqual(data1);
      expect(decrypted2).toEqual(data2);
      expect(decrypted3).toEqual(data3);
    });
  });
});
