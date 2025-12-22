/**
 * Unit tests for CryptoService password hashing methods
 * Tests TASK-010 implementation
 */

import { describe, it, expect } from 'vitest';
import { CryptoService, CryptoError, CryptoErrorCode } from '../../../src/services/CryptoService';

describe('CryptoService - Password Hashing (TASK-010)', () => {
  const cryptoService = new CryptoService();

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'test_password_123';
      const hash = await cryptoService.hashPassword(password);

      // Hash should be a non-empty string
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');

      // Hash should be in Argon2 format
      expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    });

    it('should generate unique hashes for the same password', async () => {
      const password = 'same_password';
      const hash1 = await cryptoService.hashPassword(password);
      const hash2 = await cryptoService.hashPassword(password);

      // Hashes should be different due to unique salts
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different passwords', async () => {
      const hash1 = await cryptoService.hashPassword('password1');
      const hash2 = await cryptoService.hashPassword('password2');

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(cryptoService.hashPassword('')).rejects.toThrow(CryptoError);
      await expect(cryptoService.hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for non-string password', async () => {
      await expect(cryptoService.hashPassword(null as any)).rejects.toThrow(CryptoError);
      await expect(cryptoService.hashPassword(undefined as any)).rejects.toThrow(CryptoError);
      await expect(cryptoService.hashPassword(123 as any)).rejects.toThrow(CryptoError);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(256);
      const hash = await cryptoService.hashPassword(longPassword);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('should handle passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const hash = await cryptoService.hashPassword(specialPassword);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('should handle Unicode passwords', async () => {
      const unicodePassword = '密码🔐émojis';
      const hash = await cryptoService.hashPassword(unicodePassword);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'test_password_123';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct_password';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword('wrong_password', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const password = 'TestPassword';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword('testpassword', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with extra characters', async () => {
      const password = 'password';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword('password ', hash);
      expect(isValid).toBe(false);
    });

    it('should throw error for empty password', async () => {
      const hash = '$argon2id$v=19$m=65536,t=3,p=1$somehash';
      await expect(cryptoService.verifyPassword('', hash)).rejects.toThrow(CryptoError);
    });

    it('should throw error for non-string password', async () => {
      const hash = '$argon2id$v=19$m=65536,t=3,p=1$somehash';
      await expect(cryptoService.verifyPassword(null as any, hash)).rejects.toThrow(CryptoError);
    });

    it('should throw error for empty hash', async () => {
      await expect(cryptoService.verifyPassword('password', '')).rejects.toThrow(CryptoError);
    });

    it('should throw error for non-string hash', async () => {
      await expect(cryptoService.verifyPassword('password', null as any)).rejects.toThrow(CryptoError);
    });

    it('should throw error for invalid hash format', async () => {
      await expect(
        cryptoService.verifyPassword('password', 'invalid_hash_format')
      ).rejects.toThrow(CryptoError);
      await expect(
        cryptoService.verifyPassword('password', 'invalid_hash_format')
      ).rejects.toThrow('Invalid hash format');
    });

    it('should return false for corrupted hash', async () => {
      const password = 'test_password';
      const hash = await cryptoService.hashPassword(password);
      
      // Corrupt the hash by changing a character
      const corruptedHash = hash.slice(0, -5) + 'XXXXX';

      const isValid = await cryptoService.verifyPassword(password, corruptedHash);
      expect(isValid).toBe(false);
    });

    it('should handle verification with special characters', async () => {
      const password = '!@#$%^&*()_+-=';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle verification with Unicode', async () => {
      const password = '密码🔐émojis';
      const hash = await cryptoService.hashPassword(password);

      const isValid = await cryptoService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should use constant-time verification (timing attack resistance)', async () => {
      const password = 'test_password';
      const hash = await cryptoService.hashPassword(password);

      // Verify with correct password
      const start1 = performance.now();
      await cryptoService.verifyPassword(password, hash);
      const time1 = performance.now() - start1;

      // Verify with wrong password
      const start2 = performance.now();
      await cryptoService.verifyPassword('wrong_password', hash);
      const time2 = performance.now() - start2;

      // Timing difference should be minimal (allow generous margin for browser variance)
      // This is not a perfect test but gives some confidence
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(100); // Allow up to 100ms variance
    });

    it('should not leak information via exceptions', async () => {
      const password = 'test_password';
      const hash = await cryptoService.hashPassword(password);

      // Invalid hash should return false, not throw
      const result1 = await cryptoService.verifyPassword(password, hash + 'corrupted');
      expect(result1).toBe(false);

      // Wrong password should return false, not throw
      const result2 = await cryptoService.verifyPassword('wrong', hash);
      expect(result2).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should complete hashing in reasonable time', async () => {
      const password = 'test_password_123';
      
      const start = performance.now();
      await cryptoService.hashPassword(password);
      const duration = performance.now() - start;

      // Should complete in less than 5 seconds (generous timeout)
      // Actual times: ~500-1200ms desktop, ~1200-2000ms mobile
      expect(duration).toBeLessThan(5000);
    });

    it('should complete verification in reasonable time', async () => {
      const password = 'test_password_123';
      const hash = await cryptoService.hashPassword(password);

      const start = performance.now();
      await cryptoService.verifyPassword(password, hash);
      const duration = performance.now() - start;

      // Verification should be fast (same as hashing)
      expect(duration).toBeLessThan(5000);
    });
  });
});
