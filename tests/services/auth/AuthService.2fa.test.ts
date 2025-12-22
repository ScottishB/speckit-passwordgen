/**
 * AuthService 2FA Integration Tests
 * 
 * Comprehensive tests for two-factor authentication flows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthError } from '../../../src/services/AuthService';
import { CryptoService } from '../../../src/services/CryptoService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { TotpService } from '../../../src/services/TotpService';
import { Database } from '../../../src/services/database';
import * as OTPAuth from 'otpauth';

describe('AuthService - 2FA Integration', () => {
  let authService: AuthService;
  let crypto: CryptoService;
  let sessionService: SessionService;
  let securityLog: SecurityLogService;
  let totpService: TotpService;
  let database: Database;

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Initialize services
    database = new Database();
    await database.initialize();

    crypto = new CryptoService();
    sessionService = new SessionService(database);
    securityLog = new SecurityLogService(database);
    totpService = new TotpService();
    authService = new AuthService(crypto, sessionService, securityLog, totpService, database);
  });

  afterEach(async () => {
    await database.close();
    localStorage.clear();
  });

  // ==========================================================================
  // 2FA Setup Flow Tests
  // ==========================================================================

  describe('Full 2FA setup flow', () => {
    it('should complete full 2FA setup: register → enable2FA → receive secret/QR/codes', async () => {
      // 1. Register user
      const user = await authService.register('alice', 'SecurePassword123!');
      expect(user).toBeDefined();
      expect(user.totpSecret).toBeNull();

      // 2. Enable 2FA
      const { secret, qrCode, backupCodes } = await authService.enable2FA(user.id);

      // 3. Verify secret is valid base32
      expect(secret).toBeDefined();
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);

      // 4. Verify QR code is data URL
      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64,/);

      // 5. Verify backup codes
      expect(backupCodes).toBeDefined();
      expect(backupCodes.length).toBe(10);
      backupCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
        expect(code).not.toMatch(/[0OIl]/); // No ambiguous chars
      });

      // 6. Verify user updated in database
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.totpSecret).toBe(secret);
      expect(updatedUser!.backupCodes.length).toBe(10);
      expect(updatedUser!.backupCodesUsed).toEqual([]);

      // 7. Verify security event logged
      const events = await securityLog.getUserEvents(user.id);
      const enableEvent = events.find(e => e.eventType === '2fa_enabled');
      expect(enableEvent).toBeDefined();
    });

    it('should throw error if user not found for enable2FA', async () => {
      await expect(authService.enable2FA('nonexistent')).rejects.toThrow('User not found');
    });

    it('should throw error if userId is empty', async () => {
      await expect(authService.enable2FA('')).rejects.toThrow('User ID is required');
    });
  });

  // ==========================================================================
  // Login with 2FA Tests
  // ==========================================================================

  describe('Login with 2FA enabled', () => {
    it('should require 2FA code when logging in with 2FA enabled', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('bob', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Attempt login without 2FA code
      await expect(authService.login('bob', 'SecurePassword123!')).rejects.toThrow(AuthError);
      await expect(authService.login('bob', 'SecurePassword123!')).rejects.toThrow('2FA_REQUIRED');
    });

    it('should accept valid TOTP token and complete login', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('carol', 'SecurePassword123!');
      const { secret } = await authService.enable2FA(user.id);

      // Generate current TOTP token
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const token = totp.generate();

      // Login with valid token
      const session = await authService.login('carol', 'SecurePassword123!', token);

      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should reject invalid TOTP token', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('dave', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Attempt login with invalid token
      await expect(authService.login('dave', 'SecurePassword123!', '000000')).rejects.toThrow(AuthError);
      await expect(authService.login('dave', 'SecurePassword123!', '000000')).rejects.toThrow('Invalid 2FA code');
    });

    it('should increment failed attempts on invalid 2FA code', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('eve', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Attempt login with invalid token
      await expect(authService.login('eve', 'SecurePassword123!', '000000')).rejects.toThrow();

      // Check failed attempts incremented
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.failedLoginAttempts).toBe(1);
    });

    it('should accept valid backup code and mark as used', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('frank', 'SecurePassword123!');
      const { backupCodes } = await authService.enable2FA(user.id);

      // Login with first backup code
      const session = await authService.login('frank', 'SecurePassword123!', backupCodes[0]!);

      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);

      // Verify backup code marked as used
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.backupCodesUsed).toContain(0);
    });

    it('should reject already-used backup code', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('grace', 'SecurePassword123!');
      const { backupCodes } = await authService.enable2FA(user.id);

      // Login with backup code once (succeeds)
      await authService.login('grace', 'SecurePassword123!', backupCodes[0]!);
      await authService.logout(authService.getCurrentSession()!.id);

      // Try to use same backup code again (should fail)
      await expect(authService.login('grace', 'SecurePassword123!', backupCodes[0]!)).rejects.toThrow();
    });

    it('should accept different unused backup codes', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('hank', 'SecurePassword123!');
      const { backupCodes } = await authService.enable2FA(user.id);

      // Login with first backup code
      await authService.login('hank', 'SecurePassword123!', backupCodes[0]!);
      await authService.logout(authService.getCurrentSession()!.id);

      // Login with second backup code (should succeed)
      const session2 = await authService.login('hank', 'SecurePassword123!', backupCodes[1]!);
      expect(session2).toBeDefined();

      // Verify both codes marked as used
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.backupCodesUsed).toContain(0);
      expect(updatedUser!.backupCodesUsed).toContain(1);
    });
  });

  // ==========================================================================
  // Account Lockout with 2FA Tests
  // ==========================================================================

  describe('Account lockout with 2FA', () => {
    it('should lock account after 3 failed 2FA attempts', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('iris', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Attempt 3 failed logins
      for (let i = 0; i < 3; i++) {
        await expect(authService.login('iris', 'SecurePassword123!', '000000')).rejects.toThrow();
      }

      // Verify account locked
      const lockedUser = await database.getUser(user.id);
      expect(lockedUser!.accountLockedUntil).toBeGreaterThan(Date.now());

      // Attempt login with valid password should fail (account locked)
      const totp = new OTPAuth.TOTP({
        secret: lockedUser!.totpSecret!,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const validToken = totp.generate();
      
      await expect(authService.login('iris', 'SecurePassword123!', validToken)).rejects.toThrow('Account is locked');
    });

    it('should allow login after lockout expires', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('jack', 'SecurePassword123!');
      const { secret } = await authService.enable2FA(user.id);

      // Lock account manually (simulate past lockout)
      await database.updateUser(user.id, {
        failedLoginAttempts: 3,
        accountLockedUntil: Date.now() - 1000, // Expired 1 second ago
      });

      // Generate valid token
      const totp = new OTPAuth.TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      const validToken = totp.generate();

      // Should be able to login after lockout expired
      const session = await authService.login('jack', 'SecurePassword123!', validToken);
      expect(session).toBeDefined();

      // Verify failed attempts reset
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.failedLoginAttempts).toBe(0);
      expect(updatedUser!.accountLockedUntil).toBeNull();
    });
  });

  // ==========================================================================
  // Disable 2FA Tests
  // ==========================================================================

  describe('Disable 2FA', () => {
    it('should disable 2FA with correct password', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('karen', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Disable 2FA
      await authService.disable2FA(user.id, 'SecurePassword123!');

      // Verify 2FA disabled
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.totpSecret).toBeNull();
      expect(updatedUser!.backupCodes).toEqual([]);
      expect(updatedUser!.backupCodesUsed).toEqual([]);

      // Verify security event logged
      const events = await securityLog.getUserEvents(user.id);
      const disableEvent = events.find(e => e.eventType === '2fa_disabled');
      expect(disableEvent).toBeDefined();
    });

    it('should reject disable 2FA with wrong password', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('leo', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Attempt to disable with wrong password
      await expect(authService.disable2FA(user.id, 'WrongPassword123!')).rejects.toThrow(AuthError);
      await expect(authService.disable2FA(user.id, 'WrongPassword123!')).rejects.toThrow('Invalid password');

      // Verify 2FA still enabled
      const user2 = await database.getUser(user.id);
      expect(user2!.totpSecret).not.toBeNull();
    });

    it('should throw error if userId is empty', async () => {
      await expect(authService.disable2FA('', 'password')).rejects.toThrow('User ID is required');
    });

    it('should throw error if password is empty', async () => {
      const user = await authService.register('mike', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      await expect(authService.disable2FA(user.id, '')).rejects.toThrow('Password is required');
    });

    it('should throw error if user not found', async () => {
      await expect(authService.disable2FA('nonexistent', 'password')).rejects.toThrow('User not found');
    });

    it('should allow login without 2FA code after disabling', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('nancy', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Disable 2FA
      await authService.disable2FA(user.id, 'SecurePassword123!');

      // Should be able to login without 2FA code
      const session = await authService.login('nancy', 'SecurePassword123!');
      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
    });
  });

  // ==========================================================================
  // Regenerate Backup Codes Tests
  // ==========================================================================

  describe('Regenerate backup codes', () => {
    it('should regenerate backup codes and reset used codes', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('oscar', 'SecurePassword123!');
      const { backupCodes: originalCodes } = await authService.enable2FA(user.id);

      // Use a backup code
      await authService.login('oscar', 'SecurePassword123!', originalCodes[0]!);
      await authService.logout(authService.getCurrentSession()!.id);

      // Verify code marked as used
      const userAfterLogin = await database.getUser(user.id);
      expect(userAfterLogin!.backupCodesUsed).toContain(0);

      // Regenerate backup codes
      const newCodes = await authService.regenerateBackupCodes(user.id);

      // Verify new codes generated
      expect(newCodes).toBeDefined();
      expect(newCodes.length).toBe(10);

      // Verify codes are different
      const hasDifference = newCodes.some((code, i) => code !== originalCodes[i]);
      expect(hasDifference).toBe(true);

      // Verify used codes reset
      const updatedUser = await database.getUser(user.id);
      expect(updatedUser!.backupCodesUsed).toEqual([]);

      // Verify security event logged
      const events = await securityLog.getUserEvents(user.id);
      const regenEvent = events.find(e => e.details === 'Backup codes regenerated');
      expect(regenEvent).toBeDefined();
    });

    it('should throw error if userId is empty', async () => {
      await expect(authService.regenerateBackupCodes('')).rejects.toThrow('User ID is required');
    });

    it('should throw error if user not found', async () => {
      await expect(authService.regenerateBackupCodes('nonexistent')).rejects.toThrow('User not found');
    });

    it('should throw error if 2FA not enabled', async () => {
      // Register user without 2FA
      const user = await authService.register('paul', 'SecurePassword123!');

      // Attempt to regenerate codes
      await expect(authService.regenerateBackupCodes(user.id)).rejects.toThrow('Two-factor authentication is not enabled');
    });

    it('should allow login with new backup codes after regeneration', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('quinn', 'SecurePassword123!');
      await authService.enable2FA(user.id);

      // Regenerate codes
      const newCodes = await authService.regenerateBackupCodes(user.id);

      // Should be able to login with new code
      const session = await authService.login('quinn', 'SecurePassword123!', newCodes[0]!);
      expect(session).toBeDefined();
    });

    it('should not allow login with old backup codes after regeneration', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('rachel', 'SecurePassword123!');
      const { backupCodes: oldCodes } = await authService.enable2FA(user.id);

      // Regenerate codes
      await authService.regenerateBackupCodes(user.id);

      // Old codes should not work
      await expect(authService.login('rachel', 'SecurePassword123!', oldCodes[0]!)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Complex Integration Scenarios
  // ==========================================================================

  describe('Complex 2FA scenarios', () => {
    it('should handle multiple users with 2FA independently', async () => {
      // Create two users with 2FA
      const user1 = await authService.register('sam', 'Password123!');
      const { secret: secret1, backupCodes: codes1 } = await authService.enable2FA(user1.id);

      const user2 = await authService.register('tina', 'Password456!');
      const { secret: secret2, backupCodes: codes2 } = await authService.enable2FA(user2.id);

      // Verify secrets are different
      expect(secret1).not.toBe(secret2);

      // Verify backup codes are different
      const allCodesUnique = codes1.every((code, i) => code !== codes2[i]);
      expect(allCodesUnique).toBe(true);

      // User 1 logs in with TOTP
      const totp1 = new OTPAuth.TOTP({ secret: secret1, algorithm: 'SHA1', digits: 6, period: 30 });
      const session1 = await authService.login('sam', 'Password123!', totp1.generate());
      expect(session1.userId).toBe(user1.id);

      await authService.logout(session1.id);

      // User 2 logs in with backup code
      const session2 = await authService.login('tina', 'Password456!', codes2[0]!);
      expect(session2.userId).toBe(user2.id);

      // Verify backup code usage is isolated
      const updatedUser1 = await database.getUser(user1.id);
      const updatedUser2 = await database.getUser(user2.id);
      
      expect(updatedUser1!.backupCodesUsed).toEqual([]);
      expect(updatedUser2!.backupCodesUsed).toEqual([0]);
    });

    it('should handle using all backup codes and then regenerating', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('uma', 'SecurePassword123!');
      const { backupCodes } = await authService.enable2FA(user.id);

      // Use all 10 backup codes
      for (let i = 0; i < 10; i++) {
        await authService.login('uma', 'SecurePassword123!', backupCodes[i]!);
        await authService.logout(authService.getCurrentSession()!.id);
      }

      // Verify all codes used
      const userAfterAll = await database.getUser(user.id);
      expect(userAfterAll!.backupCodesUsed.length).toBe(10);

      // Regenerate codes
      const newCodes = await authService.regenerateBackupCodes(user.id);

      // Should be able to use new codes
      const session = await authService.login('uma', 'SecurePassword123!', newCodes[0]!);
      expect(session).toBeDefined();
    });

    it('should handle failed 2FA followed by successful 2FA', async () => {
      // Setup: Register and enable 2FA
      const user = await authService.register('victor', 'SecurePassword123!');
      const { secret } = await authService.enable2FA(user.id);

      // Fail once
      await expect(authService.login('victor', 'SecurePassword123!', '000000')).rejects.toThrow();

      // Verify failed attempts
      const userAfterFail = await database.getUser(user.id);
      expect(userAfterFail!.failedLoginAttempts).toBe(1);

      // Succeed with valid token
      const totp = new OTPAuth.TOTP({ secret: secret, algorithm: 'SHA1', digits: 6, period: 30 });
      const session = await authService.login('victor', 'SecurePassword123!', totp.generate());
      expect(session).toBeDefined();

      // Verify failed attempts reset
      const userAfterSuccess = await database.getUser(user.id);
      expect(userAfterSuccess!.failedLoginAttempts).toBe(0);
    });
  });
});
