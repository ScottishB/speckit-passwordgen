/**
 * AuthService Tests
 * 
 * Comprehensive tests for authentication service functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService, ValidationError, AuthError, SessionExpiredError } from '../../../src/services/AuthService';
import { CryptoService } from '../../../src/services/CryptoService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { TotpService } from '../../../src/services/TotpService';
import { Database } from '../../../src/services/database';

describe('AuthService', () => {
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
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with all dependencies', () => {
      const service = new AuthService(crypto, sessionService, securityLog, totpService, database);
      expect(service).toBeDefined();
    });

    it('should throw error if CryptoService is missing', () => {
      expect(() => new AuthService(null as any, sessionService, securityLog, totpService, database)).toThrow(
        'CryptoService is required'
      );
    });

    it('should throw error if SessionService is missing', () => {
      expect(() => new AuthService(crypto, null as any, securityLog, totpService, database)).toThrow(
        'SessionService is required'
      );
    });

    it('should throw error if SecurityLogService is missing', () => {
      expect(() => new AuthService(crypto, sessionService, null as any, totpService, database)).toThrow(
        'SecurityLogService is required'
      );
    });

    it('should throw error if TotpService is missing', () => {
      expect(() => new AuthService(crypto, sessionService, securityLog, null as any, database)).toThrow(
        'TotpService is required'
      );
    });

    it('should throw error if Database is missing', () => {
      expect(() => new AuthService(crypto, sessionService, securityLog, totpService, null as any)).toThrow(
        'Database is required'
      );
    });
  });

  // ==========================================================================
  // User Registration Tests
  // ==========================================================================

  describe('register()', () => {
    it('should register a new user', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.id).toBeDefined();
    });

    it('should normalize username to lowercase', async () => {
      const user = await authService.register('TestUser', 'SecureP@ssw0rd123');
      expect(user.username).toBe('testuser');
    });

    it('should trim whitespace from username', async () => {
      const user = await authService.register('  testuser  ', 'SecureP@ssw0rd123');
      expect(user.username).toBe('testuser');
    });

    it('should throw error if username is empty', async () => {
      await expect(authService.register('', 'SecureP@ssw0rd123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw error if password is empty', async () => {
      await expect(authService.register('testuser', '')).rejects.toThrow(ValidationError);
    });

    it('should throw error if username is already taken', async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
      await expect(authService.register('testuser', 'AnotherP@ssw0rd456')).rejects.toThrow(
        'Username is already taken'
      );
    });

    it('should throw error if password is too weak', async () => {
      await expect(authService.register('testuser', 'weak')).rejects.toThrow(
        'Password is too weak'
      );
    });

    it('should hash password with Argon2id', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      const storedUser = await database.getUser(user.id);

      expect(storedUser?.passwordHash).toBeDefined();
      expect(storedUser?.passwordHash).toContain('$argon2id$');
    });

    it('should generate salt for key derivation', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      const storedUser = await database.getUser(user.id);

      expect(storedUser?.salt).toBeDefined();
      expect(typeof storedUser?.salt).toBe('string');
    });

    it('should log registration event', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      const events = await securityLog.getUserEvents(user.id);

      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('registration');
    });

    it('should not return password hash', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should initialize user with default values', async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      const storedUser = await database.getUser(user.id);

      expect(storedUser?.totpSecret).toBeNull();
      expect(storedUser?.backupCodes).toEqual([]);
      expect(storedUser?.failedLoginAttempts).toBe(0);
      expect(storedUser?.accountLockedUntil).toBeNull();
    });
  });

  // ==========================================================================
  // User Login Tests
  // ==========================================================================

  describe('login()', () => {
    beforeEach(async () => {
      // Register a test user
      await authService.register('testuser', 'SecureP@ssw0rd123');
    });

    it('should login with valid credentials', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBeDefined();
    });

    it('should normalize username to lowercase', async () => {
      const session = await authService.login('TestUser', 'SecureP@ssw0rd123');
      expect(session).toBeDefined();
    });

    it('should throw error if username is empty', async () => {
      await expect(authService.login('', 'SecureP@ssw0rd123')).rejects.toThrow(AuthError);
    });

    it('should throw error if password is empty', async () => {
      await expect(authService.login('testuser', '')).rejects.toThrow(AuthError);
    });

    it('should throw error if username not found', async () => {
      await expect(authService.login('nonexistent', 'SecureP@ssw0rd123')).rejects.toThrow(
        'Invalid username or password'
      );
    });

    it('should throw error if password is invalid', async () => {
      await expect(authService.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid username or password'
      );
    });

    it('should set current user on successful login', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      const currentUser = authService.getCurrentUser();

      expect(currentUser).toBeDefined();
      expect(currentUser?.username).toBe('testuser');
    });

    it('should set current session on successful login', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      const currentSession = authService.getCurrentSession();

      expect(currentSession).toBeDefined();
      expect(currentSession?.id).toBeDefined();
    });

    it('should log successful login event', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      const events = await securityLog.getEventsByType(session.userId, 'login_success');

      expect(events.length).toBeGreaterThan(0);
    });

    it('should update lastLogin timestamp', async () => {
      const beforeLogin = Date.now();
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      const user = await database.getUser(session.userId);
      const afterLogin = Date.now();

      expect(user?.lastLogin).toBeGreaterThanOrEqual(beforeLogin);
      expect(user?.lastLogin).toBeLessThanOrEqual(afterLogin);
    });
  });

  // ==========================================================================
  // Failed Login Attempt Tests
  // ==========================================================================

  describe('failed login attempts', () => {
    beforeEach(async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
    });

    it('should increment failed login attempts on wrong password', async () => {
      await authService.login('testuser', 'WrongPassword123!').catch(() => {});
      const user = await database.getUserByUsername('testuser');

      expect(user?.failedLoginAttempts).toBe(1);
    });

    it('should log failed login attempt', async () => {
      const user = await database.getUserByUsername('testuser');
      await authService.login('testuser', 'WrongPassword123!').catch(() => {});
      const events = await securityLog.getEventsByType(user!.id, 'login_failed');

      expect(events.length).toBeGreaterThan(0);
    });

    it('should lock account after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await authService.login('testuser', 'WrongPassword123!').catch(() => {});
      }

      await expect(authService.login('testuser', 'SecureP@ssw0rd123')).rejects.toThrow(
        'Account locked'
      );
    });

    it('should set accountLockedUntil after max attempts', async () => {
      const beforeLock = Date.now();

      for (let i = 0; i < 5; i++) {
        await authService.login('testuser', 'WrongPassword123!').catch(() => {});
      }

      const user = await database.getUserByUsername('testuser');
      const afterLock = Date.now();

      expect(user?.accountLockedUntil).toBeGreaterThan(beforeLock);
      expect(user?.accountLockedUntil).toBeLessThan(afterLock + 16 * 60 * 1000); // 16 minutes max
    });

    it('should reset failed attempts on successful login', async () => {
      // Fail once
      await authService.login('testuser', 'WrongPassword123!').catch(() => {});

      // Succeed
      await authService.login('testuser', 'SecureP@ssw0rd123');

      const user = await database.getUserByUsername('testuser');
      expect(user?.failedLoginAttempts).toBe(0);
    });

    it('should clear accountLockedUntil on successful login', async () => {
      // Fail once and set lockout manually
      const user = await database.getUserByUsername('testuser');
      await database.updateUser(user!.id, {
        failedLoginAttempts: 5,
        accountLockedUntil: Date.now() - 1000, // Expired lockout
      });

      // Succeed
      await authService.login('testuser', 'SecureP@ssw0rd123');

      const updatedUser = await database.getUserByUsername('testuser');
      expect(updatedUser?.accountLockedUntil).toBeNull();
    });
  });

  // ==========================================================================
  // Account Lockout Tests
  // ==========================================================================

  describe('account lockout', () => {
    beforeEach(async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
    });

    it('should reject login on locked account', async () => {
      const user = await database.getUserByUsername('testuser');
      await database.updateUser(user!.id, {
        accountLockedUntil: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      await expect(authService.login('testuser', 'SecureP@ssw0rd123')).rejects.toThrow(
        'Account is locked'
      );
    });

    it('should show remaining lockout time', async () => {
      const user = await database.getUserByUsername('testuser');
      await database.updateUser(user!.id, {
        accountLockedUntil: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      try {
        await authService.login('testuser', 'SecureP@ssw0rd123');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).message).toContain('minute');
      }
    });

    it('should allow login after lockout expires', async () => {
      const user = await database.getUserByUsername('testuser');
      await database.updateUser(user!.id, {
        accountLockedUntil: Date.now() - 1000, // Expired 1 second ago
      });

      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      expect(session).toBeDefined();
    });

    it('should log locked account login attempt', async () => {
      const user = await database.getUserByUsername('testuser');
      await database.updateUser(user!.id, {
        accountLockedUntil: Date.now() + 15 * 60 * 1000,
      });

      await authService.login('testuser', 'SecureP@ssw0rd123').catch(() => {});
      const events = await securityLog.getEventsByType(user!.id, 'login_failed');

      const lockedEvent = events.find((e) => e.details.includes('locked'));
      expect(lockedEvent).toBeDefined();
    });
  });

  // ==========================================================================
  // Two-Factor Authentication Tests
  // ==========================================================================

  describe('2FA login', () => {
    beforeEach(async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      // Manually enable 2FA
      await database.updateUser(user.id, {
        totpSecret: 'JBSWY3DPEHPK3PXP', // Base32 secret
      });
    });

    it('should require 2FA code if enabled', async () => {
      await expect(authService.login('testuser', 'SecureP@ssw0rd123')).rejects.toThrow(
        'Two-factor authentication code is required'
      );
    });

    it('should include 2FA_REQUIRED error code', async () => {
      try {
        await authService.login('testuser', 'SecureP@ssw0rd123');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('2FA_REQUIRED');
      }
    });

    // Note: Full 2FA validation tests will be added in Phase 3 when TotpService is implemented
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('logout()', () => {
    beforeEach(async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
    });

    it('should logout user', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      const retrievedSession = await sessionService.getSession(session.id);
      expect(retrievedSession).toBeNull();
    });

    it('should clear current user', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      const currentUser = authService.getCurrentUser();
      expect(currentUser).toBeNull();
    });

    it('should clear current session', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      const currentSession = authService.getCurrentSession();
      expect(currentSession).toBeNull();
    });

    it('should log logout event', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      const events = await securityLog.getEventsByType(session.userId, 'logout');
      expect(events.length).toBeGreaterThan(0);
    });

    it('should throw error if session ID is missing', async () => {
      await expect(authService.logout('')).rejects.toThrow('Session ID is required');
    });
  });

  // ==========================================================================
  // Authentication State Tests
  // ==========================================================================

  describe('authentication state', () => {
    beforeEach(async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
    });

    it('should return null for current user when not logged in', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return null for current session when not logged in', () => {
      const session = authService.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should return false for isAuthenticated when not logged in', () => {
      const authenticated = authService.isAuthenticated();
      expect(authenticated).toBe(false);
    });

    it('should return true for isAuthenticated when logged in', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      const authenticated = authService.isAuthenticated();
      expect(authenticated).toBe(true);
    });

    it('should return false for isAuthenticated after logout', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      const authenticated = authService.isAuthenticated();
      expect(authenticated).toBe(false);
    });

    it('should return false for isAuthenticated with expired session', async () => {
      const session = await authService.login('testuser', 'SecureP@ssw0rd123');

      // Manually expire session
      await database.updateSession(session.id, {
        createdAt: Date.now() - 9 * 60 * 60 * 1000, // 9 hours ago
      });

      // Retrieve updated session
      const expiredSession = await sessionService.getSession(session.id);
      if (expiredSession) {
        // Update current session in authService
        (authService as any).currentSession = expiredSession;
      }

      const authenticated = authService.isAuthenticated();
      expect(authenticated).toBe(false);
    });
  });

  // ==========================================================================
  // Password Strength Validation Tests
  // ==========================================================================

  describe('validatePasswordStrength()', () => {
    it('should validate strong password', () => {
      const result = authService.validatePasswordStrength('SecureP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password less than 12 characters', () => {
      const result = authService.validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = authService.validatePasswordStrength('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = authService.validatePasswordStrength('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = authService.validatePasswordStrength('NoNumbersHere!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = authService.validatePasswordStrength('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return all applicable errors', () => {
      const result = authService.validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty password', () => {
      const result = authService.validatePasswordStrength('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  // ==========================================================================
  // Username Availability Tests
  // ==========================================================================

  describe('isUsernameAvailable()', () => {
    it('should return true for available username', async () => {
      const available = await authService.isUsernameAvailable('newuser');
      expect(available).toBe(true);
    });

    it('should return false for taken username', async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
      const available = await authService.isUsernameAvailable('testuser');
      expect(available).toBe(false);
    });

    it('should normalize username before checking', async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');
      const available = await authService.isUsernameAvailable('TestUser');
      expect(available).toBe(false);
    });

    it('should return false for empty username', async () => {
      const available = await authService.isUsernameAvailable('');
      expect(available).toBe(false);
    });
  });

  // ==========================================================================
  // Account Deletion Tests
  // ==========================================================================

  describe('deleteAccount()', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.register('testuser', 'SecureP@ssw0rd123');
      userId = user.id;
    });

    it('should delete account with correct password', async () => {
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');
      const user = await database.getUser(userId);
      expect(user).toBeNull();
    });

    it('should throw error with wrong password', async () => {
      await expect(authService.deleteAccount(userId, 'WrongPassword123!')).rejects.toThrow(
        'Invalid password'
      );
    });

    it('should delete user vault', async () => {
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');
      const vault = await database.getVault(userId);
      expect(vault).toBeNull();
    });

    it('should invalidate all user sessions', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');

      const sessions = await database.getUserSessions(userId);
      expect(sessions).toHaveLength(0);
    });

    it('should clear security events', async () => {
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');
      const events = await securityLog.getUserEvents(userId);
      expect(events).toHaveLength(0);
    });

    it('should log deletion event before clearing', async () => {
      // Capture events before deletion
      let eventLogged = false;
      const originalLogEvent = securityLog.logEvent.bind(securityLog);
      securityLog.logEvent = async (event: any) => {
        if (event.eventType === 'account_deleted') {
          eventLogged = true;
        }
        return originalLogEvent(event);
      };

      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');
      expect(eventLogged).toBe(true);
    });

    it('should clear current user if deleting own account', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');

      const currentUser = authService.getCurrentUser();
      expect(currentUser).toBeNull();
    });

    it('should clear current session if deleting own account', async () => {
      await authService.login('testuser', 'SecureP@ssw0rd123');
      await authService.deleteAccount(userId, 'SecureP@ssw0rd123');

      const currentSession = authService.getCurrentSession();
      expect(currentSession).toBeNull();
    });

    it('should throw error if user ID is missing', async () => {
      await expect(authService.deleteAccount('', 'SecureP@ssw0rd123')).rejects.toThrow(
        'User ID is required'
      );
    });

    it('should throw error if password is missing', async () => {
      await expect(authService.deleteAccount(userId, '')).rejects.toThrow(
        'Password is required'
      );
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full registration and login flow', async () => {
      // Register
      const user = await authService.register('newuser', 'SecureP@ssw0rd123');
      expect(user.username).toBe('newuser');

      // Login
      const session = await authService.login('newuser', 'SecureP@ssw0rd123');
      expect(session.userId).toBe(user.id);

      // Check authentication
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should track security events throughout lifecycle', async () => {
      // Register
      const user = await authService.register('newuser', 'SecureP@ssw0rd123');

      // Login
      await authService.login('newuser', 'SecureP@ssw0rd123');

      // Failed login
      await authService.login('newuser', 'WrongPassword123!').catch(() => {});

      // Logout
      const session = await authService.login('newuser', 'SecureP@ssw0rd123');
      await authService.logout(session.id);

      // Check events
      const events = await securityLog.getUserEvents(user.id);
      expect(events.length).toBeGreaterThanOrEqual(4); // registration, login_success, login_failed, logout
    });

    it('should handle account deletion with active session', async () => {
      // Register and login
      const user = await authService.register('newuser', 'SecureP@ssw0rd123');
      await authService.login('newuser', 'SecureP@ssw0rd123');

      // Delete account
      await authService.deleteAccount(user.id, 'SecureP@ssw0rd123');

      // Verify everything cleaned up
      expect(authService.isAuthenticated()).toBe(false);
      expect(await database.getUser(user.id)).toBeNull();
      expect(await database.getVault(user.id)).toBeNull();
    });

    it('should prevent registration with duplicate usernames', async () => {
      await authService.register('testuser', 'SecureP@ssw0rd123');

      // Try different case
      await expect(authService.register('TestUser', 'AnotherP@ss123!')).rejects.toThrow(
        'Username is already taken'
      );
    });
  });
});
