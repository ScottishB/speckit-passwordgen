/**
 * CryptoService Utility Methods Tests
 * 
 * Tests for utility methods: generateToken, generateUUID, validatePasswordStrength
 * 
 * Security Requirements:
 * - OWASP ASVS 4.0: V2.1.1 (password strength)
 * - NIST SP 800-63B: Section 5.1.1.1 (password requirements)
 * - RFC 4122: UUID v4 specification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService } from '../../../src/services/CryptoService';

describe('CryptoService - Utility Methods', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  // ==========================================================================
  // generateToken() Tests
  // ==========================================================================

  describe('generateToken()', () => {
    it('should generate a token', () => {
      const token = cryptoService.generateToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate base64-encoded token', () => {
      const token = cryptoService.generateToken();
      
      // Base64 should only contain valid characters
      expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate token of correct length (32 bytes = 44 base64 chars)', () => {
      const token = cryptoService.generateToken();
      
      // 32 bytes = 44 base64 characters (with padding)
      expect(token.length).toBe(44);
    });

    it('should generate unique tokens each time', () => {
      const token1 = cryptoService.generateToken();
      const token2 = cryptoService.generateToken();
      const token3 = cryptoService.generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate tokens with custom length', () => {
      const token16 = cryptoService.generateToken(16);
      const token64 = cryptoService.generateToken(64);
      
      // 16 bytes = 24 base64 chars, 64 bytes = 88 base64 chars
      expect(token16.length).toBe(24);
      expect(token64.length).toBe(88);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set<string>();
      const count = 100;
      
      for (let i = 0; i < count; i++) {
        tokens.add(cryptoService.generateToken());
      }
      
      // All tokens should be unique (collision probability is astronomically low)
      expect(tokens.size).toBe(count);
    });

    it('should handle very small token lengths', () => {
      const token = cryptoService.generateToken(1);
      
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should handle large token lengths', () => {
      const token = cryptoService.generateToken(256);
      
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate tokens quickly (< 10ms)', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        cryptoService.generateToken();
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });

  // ==========================================================================
  // generateUUID() Tests
  // ==========================================================================

  describe('generateUUID()', () => {
    it('should generate a UUID', () => {
      const uuid = cryptoService.generateUUID();
      
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
    });

    it('should generate UUID in correct format', () => {
      const uuid = cryptoService.generateUUID();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidPattern);
    });

    it('should have correct version indicator (4)', () => {
      const uuid = cryptoService.generateUUID();
      
      // 13th character should be '4'
      expect(uuid[14]).toBe('4');
    });

    it('should have correct variant indicator', () => {
      const uuid = cryptoService.generateUUID();
      
      // 17th character should be one of 8, 9, a, or b
      const variantChar = uuid[19];
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should generate unique UUIDs each time', () => {
      const uuid1 = cryptoService.generateUUID();
      const uuid2 = cryptoService.generateUUID();
      const uuid3 = cryptoService.generateUUID();
      
      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate cryptographically random UUIDs', () => {
      const uuids = new Set<string>();
      const count = 100;
      
      for (let i = 0; i < count; i++) {
        uuids.add(cryptoService.generateUUID());
      }
      
      // All UUIDs should be unique (collision probability is astronomically low)
      expect(uuids.size).toBe(count);
    });

    it('should have correct length (36 characters with hyphens)', () => {
      const uuid = cryptoService.generateUUID();
      
      expect(uuid.length).toBe(36);
    });

    it('should have hyphens in correct positions', () => {
      const uuid = cryptoService.generateUUID();
      
      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });

    it('should only contain valid hexadecimal characters and hyphens', () => {
      const uuid = cryptoService.generateUUID();
      
      // Remove hyphens and check remaining characters
      const hex = uuid.replace(/-/g, '');
      expect(hex).toMatch(/^[0-9a-f]{32}$/i);
    });

    it('should generate UUIDs quickly (< 5ms)', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        cryptoService.generateUUID();
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });

  // ==========================================================================
  // validatePasswordStrength() Tests
  // ==========================================================================

  describe('validatePasswordStrength()', () => {
    describe('Valid Passwords', () => {
      it('should accept password with exactly 8 characters', () => {
        const result = cryptoService.validatePasswordStrength('abcd1234');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password with 12 characters', () => {
        const result = cryptoService.validatePasswordStrength('MyPassword12');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password with 20 characters', () => {
        const result = cryptoService.validatePasswordStrength('ThisIsALongerPassword123');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password without uppercase letters', () => {
        const result = cryptoService.validatePasswordStrength('alllowercase123');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password without lowercase letters', () => {
        const result = cryptoService.validatePasswordStrength('ALLUPPERCASE123');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password without numbers', () => {
        const result = cryptoService.validatePasswordStrength('NoNumbersHere!');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password without special characters', () => {
        const result = cryptoService.validatePasswordStrength('OnlyLettersAndNumbers123');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password with special characters', () => {
        const result = cryptoService.validatePasswordStrength('P@ssw0rd!#$%');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password with Unicode characters', () => {
        const result = cryptoService.validatePasswordStrength('Пароль123456');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password with emojis', () => {
        const result = cryptoService.validatePasswordStrength('MyPass🔐Word123');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept passphrase with spaces', () => {
        const result = cryptoService.validatePasswordStrength('correct horse battery staple');
        
        expect(result.isValid).toBe(true);
      });

      it('should accept very long password (128 characters)', () => {
        const longPassword = 'a'.repeat(128);
        const result = cryptoService.validatePasswordStrength(longPassword);
        
        expect(result.isValid).toBe(true);
      });

      it('should accept password at max length (256 characters)', () => {
        const maxPassword = 'a'.repeat(256);
        const result = cryptoService.validatePasswordStrength(maxPassword);
        
        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid Passwords - Too Short', () => {
      it('should reject password with 7 characters', () => {
        const result = cryptoService.validatePasswordStrength('abcd123');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should reject password with 1 character', () => {
        const result = cryptoService.validatePasswordStrength('a');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should reject empty password', () => {
        const result = cryptoService.validatePasswordStrength('');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });
    });

    describe('Invalid Passwords - Too Long', () => {
      it('should reject password with 257 characters', () => {
        const tooLong = 'a'.repeat(257);
        const result = cryptoService.validatePasswordStrength(tooLong);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be less than 256 characters');
      });

      it('should reject very long password (1000 characters)', () => {
        const veryLong = 'a'.repeat(1000);
        const result = cryptoService.validatePasswordStrength(veryLong);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be less than 256 characters');
      });
    });

    describe('Invalid Passwords - Common Passwords', () => {
      it('should reject "password"', () => {
        const result = cryptoService.validatePasswordStrength('password');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject "123456"', () => {
        const result = cryptoService.validatePasswordStrength('123456');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject "qwerty"', () => {
        const result = cryptoService.validatePasswordStrength('qwerty');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject "password123"', () => {
        const result = cryptoService.validatePasswordStrength('password123');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject "admin"', () => {
        const result = cryptoService.validatePasswordStrength('admin');
        
        expect(result.isValid).toBe(false);
        // Will fail on length or common check
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject case-insensitive common password (PASSWORD)', () => {
        const result = cryptoService.validatePasswordStrength('PASSWORD');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject all-digit passwords (up to 10 digits)', () => {
        const result = cryptoService.validatePasswordStrength('1234567890');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject keyboard pattern (qwertyuiop)', () => {
        const result = cryptoService.validatePasswordStrength('qwertyuiop');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should reject keyboard pattern (asdfghjkl)', () => {
        const result = cryptoService.validatePasswordStrength('asdfghjkl');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('common'))).toBe(true);
      });

      it('should accept long all-digit password (11+ digits)', () => {
        const result = cryptoService.validatePasswordStrength('12345678901');
        
        // Should pass (more than 10 digits)
        expect(result.isValid).toBe(true);
      });
    });

    describe('Input Validation', () => {
      it('should reject null password', () => {
        const result = cryptoService.validatePasswordStrength(null as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should reject undefined password', () => {
        const result = cryptoService.validatePasswordStrength(undefined as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is required');
      });

      it('should reject non-string password (number)', () => {
        const result = cryptoService.validatePasswordStrength(12345678 as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be a string');
      });

      it('should reject non-string password (object)', () => {
        const result = cryptoService.validatePasswordStrength({ password: 'test' } as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be a string');
      });

      it('should reject non-string password (array)', () => {
        const result = cryptoService.validatePasswordStrength(['password'] as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be a string');
      });
    });

    describe('Multiple Errors', () => {
      it('should return multiple errors for short common password', () => {
        const result = cryptoService.validatePasswordStrength('pass');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      it('should return multiple errors for long common password', () => {
        const tooLong = 'password' + 'a'.repeat(260);
        const result = cryptoService.validatePasswordStrength(tooLong);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('Return Value Structure', () => {
      it('should return object with isValid and errors properties', () => {
        const result = cryptoService.validatePasswordStrength('ValidPass123');
        
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
      });

      it('should return boolean isValid', () => {
        const result = cryptoService.validatePasswordStrength('ValidPass123');
        
        expect(typeof result.isValid).toBe('boolean');
      });

      it('should return array of errors', () => {
        const result = cryptoService.validatePasswordStrength('short');
        
        expect(Array.isArray(result.errors)).toBe(true);
      });

      it('should return empty errors array for valid password', () => {
        const result = cryptoService.validatePasswordStrength('ValidPass123');
        
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Performance', () => {
      it('should validate password quickly (< 5ms)', () => {
        const start = performance.now();
        
        for (let i = 0; i < 100; i++) {
          cryptoService.validatePasswordStrength('MyPassword123');
        }
        
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5);
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should generate unique tokens for session management', () => {
      const sessionTokens = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        sessionTokens.add(cryptoService.generateToken());
      }
      
      expect(sessionTokens.size).toBe(10);
    });

    it('should generate unique UUIDs for entity IDs', () => {
      const entityIds = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        entityIds.add(cryptoService.generateUUID());
      }
      
      expect(entityIds.size).toBe(10);
    });

    it('should validate user registration passwords', () => {
      const testCases = [
        { password: 'short', shouldPass: false },
        { password: 'ValidPassword123', shouldPass: true },
        { password: 'password', shouldPass: false },
        { password: 'MySecurePassphrase2024', shouldPass: true },
      ];

      for (const { password, shouldPass } of testCases) {
        const result = cryptoService.validatePasswordStrength(password);
        expect(result.isValid).toBe(shouldPass);
      }
    });

    it('should work with all utility methods in sequence', () => {
      // Generate token
      const token = cryptoService.generateToken();
      expect(token).toBeDefined();
      
      // Generate UUID
      const uuid = cryptoService.generateUUID();
      expect(uuid).toBeDefined();
      
      // Validate password
      const validation = cryptoService.validatePasswordStrength('SecurePassword123');
      expect(validation.isValid).toBe(true);
    });
  });
});
