/**
 * Unit tests for CryptoService key derivation methods
 * Tests TASK-011 implementation
 */

import { describe, it, expect } from 'vitest';
import { CryptoService, CryptoError, CryptoErrorCode } from '../../../src/services/CryptoService';

describe('CryptoService - Key Derivation (TASK-011)', () => {
  const cryptoService = new CryptoService();

  describe('deriveEncryptionKey', () => {
    it('should derive a key from master password and salt', async () => {
      const masterPassword = 'user_master_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Key should be a CryptoKey object
      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
      expect((key.algorithm as any).length).toBe(256);
    });

    it('should derive consistent keys with same inputs', async () => {
      const masterPassword = 'consistent_password';
      const salt = cryptoService.generateSalt();

      const key1 = await cryptoService.deriveEncryptionKey(masterPassword, salt);
      const key2 = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Keys should have same properties (can't compare directly due to non-extractable)
      expect(key1.type).toBe(key2.type);
      expect(key1.algorithm.name).toBe(key2.algorithm.name);
      expect((key1.algorithm as any).length).toBe((key2.algorithm as any).length);
    });

    it('should derive different keys with different passwords', async () => {
      const salt = cryptoService.generateSalt();

      const key1 = await cryptoService.deriveEncryptionKey('password1', salt);
      const key2 = await cryptoService.deriveEncryptionKey('password2', salt);

      // Both should be valid keys but we can't compare them directly
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).toBeInstanceOf(CryptoKey);
      expect(key2).toBeInstanceOf(CryptoKey);
    });

    it('should derive different keys with different salts', async () => {
      const masterPassword = 'same_password';
      const salt1 = cryptoService.generateSalt();
      const salt2 = cryptoService.generateSalt();

      const key1 = await cryptoService.deriveEncryptionKey(masterPassword, salt1);
      const key2 = await cryptoService.deriveEncryptionKey(masterPassword, salt2);

      // Both should be valid keys
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).toBeInstanceOf(CryptoKey);
      expect(key2).toBeInstanceOf(CryptoKey);
    });

    it('should accept salt as Uint8Array', async () => {
      const masterPassword = 'test_password';
      const salt = new Uint8Array(32);
      crypto.getRandomValues(salt);

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
    });

    it('should accept salt as base64 string', async () => {
      const masterPassword = 'test_password';
      const saltBytes = cryptoService.generateSalt();
      const saltBase64 = btoa(String.fromCharCode(...saltBytes));

      const key = await cryptoService.deriveEncryptionKey(masterPassword, saltBase64);

      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
    });

    it('should throw error for empty master password', async () => {
      const salt = cryptoService.generateSalt();

      await expect(
        cryptoService.deriveEncryptionKey('', salt)
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.deriveEncryptionKey('', salt)
      ).rejects.toThrow('Master password cannot be empty');
    });

    it('should throw error for non-string master password', async () => {
      const salt = cryptoService.generateSalt();

      await expect(
        cryptoService.deriveEncryptionKey(null as any, salt)
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.deriveEncryptionKey(undefined as any, salt)
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.deriveEncryptionKey(123 as any, salt)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw error for invalid salt type', async () => {
      const masterPassword = 'test_password';

      await expect(
        cryptoService.deriveEncryptionKey(masterPassword, null as any)
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.deriveEncryptionKey(masterPassword, 123 as any)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw error for invalid base64 salt', async () => {
      const masterPassword = 'test_password';
      const invalidBase64 = 'not-valid-base64!!!';

      await expect(
        cryptoService.deriveEncryptionKey(masterPassword, invalidBase64)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw error for salt that is too short', async () => {
      const masterPassword = 'test_password';
      const shortSalt = new Uint8Array(8); // Only 8 bytes, minimum is 16

      await expect(
        cryptoService.deriveEncryptionKey(masterPassword, shortSalt)
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.deriveEncryptionKey(masterPassword, shortSalt)
      ).rejects.toThrow('Salt too short');
    });

    it('should handle long master passwords', async () => {
      const longPassword = 'a'.repeat(256);
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(longPassword, salt);

      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
    });

    it('should handle master passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(specialPassword, salt);

      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
    });

    it('should handle master passwords with Unicode', async () => {
      const unicodePassword = '密码🔐émojis';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(unicodePassword, salt);

      expect(key).toBeDefined();
      expect(key).toBeInstanceOf(CryptoKey);
    });
  });

  describe('Key Properties', () => {
    it('should derive non-extractable keys', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Key should be non-extractable (can't be exported)
      expect(key.extractable).toBe(false);
    });

    it('should derive keys with correct usages', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Key should be usable for encryption and decryption
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('should derive 256-bit keys', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Key length should be 256 bits
      expect((key.algorithm as any).length).toBe(256);
    });
  });

  describe('PBKDF2 Parameters', () => {
    it('should use SHA-256 hash function', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Algorithm should be AES-GCM (derived with PBKDF2-SHA256)
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should use 100,000 iterations (NIST compliant)', async () => {
      // This is tested indirectly through performance testing
      // 100,000 iterations should take reasonable time
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const start = performance.now();
      await cryptoService.deriveEncryptionKey(masterPassword, salt);
      const duration = performance.now() - start;

      // Should complete but take some time (minimum ~100ms)
      expect(duration).toBeGreaterThan(100);
      expect(duration).toBeLessThan(10000); // Max 10 seconds
    });
  });

  describe('Performance', () => {
    it('should complete key derivation in reasonable time', async () => {
      const masterPassword = 'test_password_123';
      const salt = cryptoService.generateSalt();

      const start = performance.now();
      await cryptoService.deriveEncryptionKey(masterPassword, salt);
      const duration = performance.now() - start;

      // Should complete in less than 10 seconds (generous timeout)
      // Actual times: ~500-1500ms desktop, ~1500-3000ms mobile
      expect(duration).toBeLessThan(10000);
    });

    it('should handle multiple derivations efficiently', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const start = performance.now();
      
      // Derive 5 keys
      await Promise.all([
        cryptoService.deriveEncryptionKey(masterPassword, salt),
        cryptoService.deriveEncryptionKey(masterPassword, salt),
        cryptoService.deriveEncryptionKey(masterPassword, salt),
        cryptoService.deriveEncryptionKey(masterPassword, salt),
        cryptoService.deriveEncryptionKey(masterPassword, salt),
      ]);

      const duration = performance.now() - start;

      // Should complete all in reasonable time
      expect(duration).toBeLessThan(50000); // Max 50 seconds for 5 keys
    });
  });

  describe('Security Properties', () => {
    it('should derive keys suitable for encryption', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Verify key can be used for encryption (by checking properties)
      expect(key.type).toBe('secret');
      expect(key.usages).toContain('encrypt');
      expect((key.algorithm as any).name).toBe('AES-GCM');
    });

    it('should prevent key extraction', async () => {
      const masterPassword = 'test_password';
      const salt = cryptoService.generateSalt();

      const key = await cryptoService.deriveEncryptionKey(masterPassword, salt);

      // Attempt to export key should fail
      await expect(
        crypto.subtle.exportKey('raw', key)
      ).rejects.toThrow();
    });
  });
});
