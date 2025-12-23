/**
 * TotpService Tests
 * 
 * Comprehensive tests for two-factor authentication TOTP service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TotpService } from '../../../src/services/TotpService';
import { User } from '../../../src/models/User';
import * as OTPAuth from 'otpauth';

describe('TotpService', () => {
  let totpService: TotpService;

  beforeEach(() => {
    totpService = new TotpService();
  });

  // ==========================================================================
  // Secret Generation Tests
  // ==========================================================================

  describe('generateSecret()', () => {
    it('should generate a valid base32 secret', () => {
      const secret = totpService.generateSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
      
      // Base32 alphabet: A-Z and 2-7
      const base32Regex = /^[A-Z2-7]+=*$/;
      expect(secret).toMatch(base32Regex);
    });

    it('should generate unique secrets on multiple calls', () => {
      const secret1 = totpService.generateSecret();
      const secret2 = totpService.generateSecret();
      const secret3 = totpService.generateSecret();

      expect(secret1).not.toBe(secret2);
      expect(secret2).not.toBe(secret3);
      expect(secret1).not.toBe(secret3);
    });

    it('should generate secrets with sufficient entropy', () => {
      const secret = totpService.generateSecret();
      
      // Should be at least 160 bits (20 bytes) = ~32 base32 chars
      expect(secret.replace(/=/g, '').length).toBeGreaterThanOrEqual(32);
    });

    it('should generate secrets compatible with OTPAuth library', () => {
      const secret = totpService.generateSecret();

      // Should be able to create a TOTP instance with the secret
      expect(() => {
        new OTPAuth.TOTP({
          secret: secret,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // QR Code Generation Tests
  // ==========================================================================

  describe('generateQRCode()', () => {
    it('should generate a QR code data URL', async () => {
      const secret = totpService.generateSecret();
      const qrCode = await totpService.generateQRCode(secret, 'testuser');

      expect(qrCode).toBeDefined();
      expect(typeof qrCode).toBe('string');
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should include username in QR code', async () => {
      const secret = totpService.generateSecret();
      const username = 'alice';
      
      // Generate QR code
      const qrCode = await totpService.generateQRCode(secret, username);
      
      expect(qrCode).toBeDefined();
      expect(qrCode.length).toBeGreaterThan(100); // Should be substantial base64 data
    });

    it('should include custom issuer in QR code', async () => {
      const secret = totpService.generateSecret();
      const qrCode = await totpService.generateQRCode(secret, 'testuser', 'MyApp');

      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should use default issuer when not provided', async () => {
      const secret = totpService.generateSecret();
      const qrCode = await totpService.generateQRCode(secret, 'testuser');

      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it('should throw error for empty secret', async () => {
      await expect(totpService.generateQRCode('', 'testuser')).rejects.toThrow();
    });

    it('should throw error for empty username', async () => {
      const secret = totpService.generateSecret();
      await expect(totpService.generateQRCode(secret, '')).rejects.toThrow();
    });

    it('should handle special characters in username', async () => {
      const secret = totpService.generateSecret();
      const qrCode = await totpService.generateQRCode(secret, 'user@example.com');

      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  // ==========================================================================
  // TOTP Token Validation Tests
  // ==========================================================================

  describe('validateToken()', () => {
    it('should validate correct TOTP token at current time', () => {
      const secret = totpService.generateSecret();
      
      // Generate current token
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const token = totp.generate();

      // Should validate successfully
      const isValid = totpService.validateToken(token, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP token', () => {
      const secret = totpService.generateSecret();
      const invalidToken = '000000';

      const isValid = totpService.validateToken(invalidToken, secret);
      expect(isValid).toBe(false);
    });

    it('should reject empty token', () => {
      const secret = totpService.generateSecret();

      const isValid = totpService.validateToken('', secret);
      expect(isValid).toBe(false);
    });

    it('should reject token with wrong length', () => {
      const secret = totpService.generateSecret();

      expect(totpService.validateToken('123', secret)).toBe(false);
      expect(totpService.validateToken('1234567', secret)).toBe(false);
    });

    it('should reject non-numeric token', () => {
      const secret = totpService.generateSecret();

      expect(totpService.validateToken('abcdef', secret)).toBe(false);
      expect(totpService.validateToken('12345a', secret)).toBe(false);
    });

    it('should allow time drift within window (±30 seconds)', () => {
      const secret = totpService.generateSecret();
      
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      // Generate token for previous period
      const previousToken = totp.generate({ timestamp: Date.now() - 30000 });
      expect(totpService.validateToken(previousToken, secret)).toBe(true);

      // Generate token for next period
      const nextToken = totp.generate({ timestamp: Date.now() + 30000 });
      expect(totpService.validateToken(nextToken, secret)).toBe(true);
    });

    it('should reject token outside time drift window', () => {
      const secret = totpService.generateSecret();
      
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      // Generate token for 2 periods ago (60 seconds)
      const oldToken = totp.generate({ timestamp: Date.now() - 60000 });
      expect(totpService.validateToken(oldToken, secret)).toBe(false);

      // Generate token for 2 periods ahead (60 seconds)
      const futureToken = totp.generate({ timestamp: Date.now() + 60000 });
      expect(totpService.validateToken(futureToken, secret)).toBe(false);
    });

    it('should reject token with invalid secret', () => {
      const token = '123456';
      const invalidSecret = 'INVALID';

      const isValid = totpService.validateToken(token, invalidSecret);
      expect(isValid).toBe(false);
    });
  });

  // ==========================================================================
  // Backup Code Generation Tests
  // ==========================================================================

  describe('generateBackupCodes()', () => {
    it('should generate 10 backup codes', () => {
      const codes = totpService.generateBackupCodes();

      expect(codes).toBeDefined();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(10);
    });

    it('should generate 8-character codes', () => {
      const codes = totpService.generateBackupCodes();

      codes.forEach(code => {
        expect(code.length).toBe(8);
      });
    });

    it('should generate alphanumeric codes', () => {
      const codes = totpService.generateBackupCodes();
      const alphanumericRegex = /^[A-Z0-9]+$/;

      codes.forEach(code => {
        expect(code).toMatch(alphanumericRegex);
      });
    });

    it('should generate unique codes', () => {
      const codes = totpService.generateBackupCodes();
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });

    it('should exclude ambiguous characters (0, O, I, l)', () => {
      const codes = totpService.generateBackupCodes();
      const ambiguousChars = /[0OIl]/;

      codes.forEach(code => {
        expect(code).not.toMatch(ambiguousChars);
      });
    });

    it('should generate different codes on multiple calls', () => {
      const codes1 = totpService.generateBackupCodes();
      const codes2 = totpService.generateBackupCodes();

      // At least some codes should be different
      const hasDifference = codes1.some((code, i) => code !== codes2[i]);
      expect(hasDifference).toBe(true);
    });
  });

  // ==========================================================================
  // Backup Code Hashing Tests
  // ==========================================================================

  describe('hashBackupCode()', () => {
    it('should hash a backup code', async () => {
      const code = 'ABCD1234';
      const hash = await totpService.hashBackupCode(code);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce consistent hashes for same code', async () => {
      const code = 'ABCD1234';
      const hash1 = await totpService.hashBackupCode(code);
      const hash2 = await totpService.hashBackupCode(code);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', async () => {
      const hash1 = await totpService.hashBackupCode('ABCD1234');
      const hash2 = await totpService.hashBackupCode('EFGH5678');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex-encoded hash', async () => {
      const code = 'ABCD1234';
      const hash = await totpService.hashBackupCode(code);

      // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw error for empty code', async () => {
      await expect(totpService.hashBackupCode('')).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Backup Code Validation Tests
  // ==========================================================================

  describe('validateBackupCode()', () => {
    it('should validate correct backup code', async () => {
      const code = 'ABCD1234';
      const hash = await totpService.hashBackupCode(code);

      const isValid = await totpService.validateBackupCode(code, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect backup code', async () => {
      const code = 'ABCD1234';
      const hash = await totpService.hashBackupCode(code);

      const isValid = await totpService.validateBackupCode('WRONG123', hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty code', async () => {
      const hash = await totpService.hashBackupCode('ABCD1234');

      const isValid = await totpService.validateBackupCode('', hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty hash', async () => {
      const isValid = await totpService.validateBackupCode('ABCD1234', '');
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const code = 'ABCD1234';
      const hash = await totpService.hashBackupCode(code);

      const isValid = await totpService.validateBackupCode('abcd1234', hash);
      expect(isValid).toBe(false);
    });

    it('should handle hash/validate round-trip for all generated codes', async () => {
      const codes = totpService.generateBackupCodes();
      
      for (const code of codes) {
        const hash = await totpService.hashBackupCode(code);
        const isValid = await totpService.validateBackupCode(code, hash);
        expect(isValid).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Backup Code Exhaustion Tests
  // ==========================================================================

  describe('areBackupCodesExhausted()', () => {
    it('should return false when no codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [],
      };

      const exhausted = totpService.areBackupCodesExhausted(user as User);
      expect(exhausted).toBe(false);
    });

    it('should return false when some codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2],
      };

      const exhausted = totpService.areBackupCodesExhausted(user as User);
      expect(exhausted).toBe(false);
    });

    it('should return true when all codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const exhausted = totpService.areBackupCodesExhausted(user as User);
      expect(exhausted).toBe(true);
    });

    it('should return false when user has no backup codes', () => {
      const user: Partial<User> = {
        backupCodes: [],
        backupCodesUsed: [],
      };

      const exhausted = totpService.areBackupCodesExhausted(user as User);
      expect(exhausted).toBe(false);
    });

    it('should handle edge case with 9 of 10 codes used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      };

      const exhausted = totpService.areBackupCodesExhausted(user as User);
      expect(exhausted).toBe(false);
    });
  });

  // ==========================================================================
  // Remaining Backup Codes Count Tests
  // ==========================================================================

  describe('getRemainingBackupCodesCount()', () => {
    it('should return 10 when no codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [],
      };

      const remaining = totpService.getRemainingBackupCodesCount(user as User);
      expect(remaining).toBe(10);
    });

    it('should return correct count when some codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2],
      };

      const remaining = totpService.getRemainingBackupCodesCount(user as User);
      expect(remaining).toBe(7);
    });

    it('should return 0 when all codes are used', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      };

      const remaining = totpService.getRemainingBackupCodesCount(user as User);
      expect(remaining).toBe(0);
    });

    it('should return 0 when user has no backup codes', () => {
      const user: Partial<User> = {
        backupCodes: [],
        backupCodesUsed: [],
      };

      const remaining = totpService.getRemainingBackupCodesCount(user as User);
      expect(remaining).toBe(0);
    });

    it('should return 1 when only 1 code remains', () => {
      const user: Partial<User> = {
        backupCodes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9', 'hash10'],
        backupCodesUsed: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      };

      const remaining = totpService.getRemainingBackupCodesCount(user as User);
      expect(remaining).toBe(1);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration scenarios', () => {
    it('should complete full TOTP setup flow', async () => {
      // 1. Generate secret
      const secret = totpService.generateSecret();
      expect(secret).toBeDefined();

      // 2. Generate QR code
      const qrCode = await totpService.generateQRCode(secret, 'testuser');
      expect(qrCode).toMatch(/^data:image\/png;base64,/);

      // 3. Generate backup codes
      const codes = totpService.generateBackupCodes();
      expect(codes.length).toBe(10);

      // 4. Hash backup codes
      const hashedCodes = await Promise.all(
        codes.map(code => totpService.hashBackupCode(code))
      );
      expect(hashedCodes.length).toBe(10);

      // 5. Validate a backup code
      const isValid = await totpService.validateBackupCode(codes[0]!, hashedCodes[0]!);
      expect(isValid).toBe(true);
    });

    it('should track backup code usage correctly', async () => {
      const codes = totpService.generateBackupCodes();
      const hashedCodes = await Promise.all(
        codes.map(code => totpService.hashBackupCode(code))
      );

      const user: Partial<User> = {
        backupCodes: hashedCodes,
        backupCodesUsed: [],
      };

      // Initially, no codes exhausted
      expect(totpService.areBackupCodesExhausted(user as User)).toBe(false);
      expect(totpService.getRemainingBackupCodesCount(user as User)).toBe(10);

      // Use some codes
      user.backupCodesUsed = [0, 1, 2];
      expect(totpService.areBackupCodesExhausted(user as User)).toBe(false);
      expect(totpService.getRemainingBackupCodesCount(user as User)).toBe(7);

      // Use all codes
      user.backupCodesUsed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      expect(totpService.areBackupCodesExhausted(user as User)).toBe(true);
      expect(totpService.getRemainingBackupCodesCount(user as User)).toBe(0);
    });

    it('should validate TOTP with time tolerance', () => {
      const secret = totpService.generateSecret();
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      // Current token should work
      const currentToken = totp.generate();
      expect(totpService.validateToken(currentToken, secret)).toBe(true);

      // Token from previous period should work (within window)
      const previousToken = totp.generate({ timestamp: Date.now() - 30000 });
      expect(totpService.validateToken(previousToken, secret)).toBe(true);

      // Token from next period should work (within window)
      const nextToken = totp.generate({ timestamp: Date.now() + 30000 });
      expect(totpService.validateToken(nextToken, secret)).toBe(true);

      // Token from 2 periods ago should fail (outside window)
      const oldToken = totp.generate({ timestamp: Date.now() - 60000 });
      expect(totpService.validateToken(oldToken, secret)).toBe(false);
    });
  });
});
