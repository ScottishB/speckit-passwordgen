/**
 * SessionService Lifecycle Methods Tests
 * 
 * Tests for session creation, retrieval, activity tracking, and invalidation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService } from '../../../src/services/SessionService';
import { Database } from '../../../src/services/database';
import type { User } from '../../../src/models/User';

describe('SessionService - Lifecycle Methods', () => {
  let sessionService: SessionService;
  let database: Database;

  // Helper function to create a test user
  const createTestUser = (overrides: Partial<User> = {}): User => ({
    id: 'test-user-id',
    username: 'testuser',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$...',
    salt: 'dGVzdHNhbHQ=',
    totpSecret: null,
    backupCodes: [],
    backupCodesUsed: [],
    createdAt: Date.now(),
    lastLogin: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  });

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    database = new Database();
    await database.initialize();

    sessionService = new SessionService(database);
  });

  afterEach(async () => {
    await database.close();
    localStorage.clear();
  });

  // ==========================================================================
  // createSession() Tests
  // ==========================================================================

  describe('createSession()', () => {
    it('should create a new session', async () => {
      const userId = 'user-123';

      const session = await sessionService.createSession(userId);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.sessionToken).toBeDefined();
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.expiresAt).toBeDefined();
    });

    it('should generate unique session IDs', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-1');
      const session3 = await sessionService.createSession('user-1');

      expect(session1.id).not.toBe(session2.id);
      expect(session2.id).not.toBe(session3.id);
      expect(session1.id).not.toBe(session3.id);
    });

    it('should generate unique session tokens', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-1');

      expect(session1.sessionToken).not.toBe(session2.sessionToken);
    });

    it('should set timestamps correctly', async () => {
      const beforeCreate = Date.now();
      const session = await sessionService.createSession('user-123');
      const afterCreate = Date.now();

      expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(session.lastActivity).toBe(session.createdAt);
    });

    it('should set expiration to 8 hours from creation', async () => {
      const session = await sessionService.createSession('user-123');
      const expectedExpiration = session.createdAt + (8 * 60 * 60 * 1000);

      expect(session.expiresAt).toBe(expectedExpiration);
    });

    it('should persist session to database', async () => {
      const session = await sessionService.createSession('user-123');

      const retrieved = await database.getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should throw error if userId is not provided', async () => {
      await expect(sessionService.createSession('')).rejects.toThrow('User ID is required');
    });

    it('should set device info', async () => {
      const session = await sessionService.createSession('user-123');

      expect(session.deviceInfo).toBeDefined();
      expect(typeof session.deviceInfo).toBe('string');
    });

    it('should set IP address', async () => {
      const session = await sessionService.createSession('user-123');

      expect(session.ipAddress).toBe('local');
    });

    it('should create multiple sessions for same user', async () => {
      const userId = 'user-123';

      const session1 = await sessionService.createSession(userId);
      const session2 = await sessionService.createSession(userId);
      const session3 = await sessionService.createSession(userId);

      const userSessions = await database.getUserSessions(userId);
      expect(userSessions).toHaveLength(3);
    });
  });

  // ==========================================================================
  // getSession() Tests
  // ==========================================================================

  describe('getSession()', () => {
    it('should retrieve an existing session', async () => {
      const created = await sessionService.createSession('user-123');

      const retrieved = await sessionService.getSession(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userId).toBe(created.userId);
      expect(retrieved?.sessionToken).toBe(created.sessionToken);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await sessionService.getSession('non-existent-session');

      expect(retrieved).toBeNull();
    });

    it('should throw error if sessionId is not provided', async () => {
      await expect(sessionService.getSession('')).rejects.toThrow('Session ID is required');
    });

    it('should retrieve correct session from multiple sessions', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-1');
      const session3 = await sessionService.createSession('user-1');

      const retrieved = await sessionService.getSession(session2.id);

      expect(retrieved?.id).toBe(session2.id);
      expect(retrieved?.sessionToken).toBe(session2.sessionToken);
    });
  });

  // ==========================================================================
  // updateActivity() Tests
  // ==========================================================================

  describe('updateActivity()', () => {
    it('should update last activity timestamp', async () => {
      const session = await sessionService.createSession('user-123');
      const originalActivity = session.lastActivity;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await sessionService.updateActivity(session.id);

      const updated = await sessionService.getSession(session.id);
      expect(updated?.lastActivity).toBeGreaterThan(originalActivity);
    });

    it('should not change other session properties', async () => {
      const session = await sessionService.createSession('user-123');

      await sessionService.updateActivity(session.id);

      const updated = await sessionService.getSession(session.id);
      expect(updated?.id).toBe(session.id);
      expect(updated?.userId).toBe(session.userId);
      expect(updated?.sessionToken).toBe(session.sessionToken);
      expect(updated?.createdAt).toBe(session.createdAt);
      expect(updated?.expiresAt).toBe(session.expiresAt);
    });

    it('should persist activity update to database', async () => {
      const session = await sessionService.createSession('user-123');
      await new Promise(resolve => setTimeout(resolve, 10));

      await sessionService.updateActivity(session.id);

      const stored = await database.getSession(session.id);
      expect(stored?.lastActivity).toBeGreaterThan(session.lastActivity);
    });

    it('should throw error if sessionId is not provided', async () => {
      await expect(sessionService.updateActivity('')).rejects.toThrow('Session ID is required');
    });

    it('should throw error if session not found', async () => {
      await expect(sessionService.updateActivity('non-existent-session')).rejects.toThrow('Session not found');
    });

    it('should handle multiple activity updates', async () => {
      const session = await sessionService.createSession('user-123');
      const activities: number[] = [session.lastActivity];

      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        await sessionService.updateActivity(session.id);
        const updated = await sessionService.getSession(session.id);
        activities.push(updated!.lastActivity);
      }

      // Each activity should be greater than the previous
      for (let i = 1; i < activities.length; i++) {
        expect(activities[i]!).toBeGreaterThan(activities[i - 1]!);
      }
    });
  });

  // ==========================================================================
  // invalidateSession() Tests
  // ==========================================================================

  describe('invalidateSession()', () => {
    it('should delete session from database', async () => {
      const session = await sessionService.createSession('user-123');

      await sessionService.invalidateSession(session.id);

      const retrieved = await sessionService.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should persist deletion to database', async () => {
      const session = await sessionService.createSession('user-123');

      await sessionService.invalidateSession(session.id);

      const stored = await database.getSession(session.id);
      expect(stored).toBeNull();
    });

    it('should be idempotent (no error if session does not exist)', async () => {
      await expect(sessionService.invalidateSession('non-existent-session')).resolves.toBeUndefined();
    });

    it('should throw error if sessionId is not provided', async () => {
      await expect(sessionService.invalidateSession('')).rejects.toThrow('Session ID is required');
    });

    it('should only invalidate specified session', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-1');
      const session3 = await sessionService.createSession('user-1');

      await sessionService.invalidateSession(session2.id);

      const retrieved1 = await sessionService.getSession(session1.id);
      const retrieved2 = await sessionService.getSession(session2.id);
      const retrieved3 = await sessionService.getSession(session3.id);

      expect(retrieved1).not.toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrieved3).not.toBeNull();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full session lifecycle', async () => {
      // Create session
      const session = await sessionService.createSession('user-123');
      expect(session.id).toBeDefined();

      // Retrieve session
      let retrieved = await sessionService.getSession(session.id);
      expect(retrieved).not.toBeNull();

      // Update activity
      await new Promise(resolve => setTimeout(resolve, 10));
      await sessionService.updateActivity(session.id);
      retrieved = await sessionService.getSession(session.id);
      expect(retrieved?.lastActivity).toBeGreaterThan(session.lastActivity);

      // Invalidate session
      await sessionService.invalidateSession(session.id);
      retrieved = await sessionService.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should handle concurrent session operations', async () => {
      const userId = 'concurrent-user';

      // Create multiple sessions concurrently
      const createPromises = Array.from({ length: 5 }, () =>
        sessionService.createSession(userId)
      );
      const sessions = await Promise.all(createPromises);

      expect(sessions).toHaveLength(5);
      const userSessions = await database.getUserSessions(userId);
      expect(userSessions).toHaveLength(5);

      // Update activities concurrently
      const updatePromises = sessions.map(s => sessionService.updateActivity(s.id));
      await Promise.all(updatePromises);

      // Verify all sessions still exist
      for (const session of sessions) {
        const retrieved = await sessionService.getSession(session.id);
        expect(retrieved).not.toBeNull();
      }
    });

    it('should persist sessions across database close and reopen', async () => {
      const session = await sessionService.createSession('user-123');
      await database.close();

      // Create new database and service instances
      const newDb = new Database();
      await newDb.initialize();
      const newService = new SessionService(newDb);

      const retrieved = await newService.getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user-123');

      await newDb.close();
    });

    it('should support multi-device sessions', async () => {
      const userId = 'multi-device-user';

      // Create sessions for different devices
      const desktopSession = await sessionService.createSession(userId);
      const mobileSession = await sessionService.createSession(userId);
      const tabletSession = await sessionService.createSession(userId);

      const userSessions = await database.getUserSessions(userId);
      expect(userSessions).toHaveLength(3);

      // Update activity on one device
      await sessionService.updateActivity(mobileSession.id);

      // Invalidate one device session
      await sessionService.invalidateSession(desktopSession.id);

      const remainingSessions = await database.getUserSessions(userId);
      expect(remainingSessions).toHaveLength(2);
      expect(remainingSessions.some(s => s.id === mobileSession.id)).toBe(true);
      expect(remainingSessions.some(s => s.id === tabletSession.id)).toBe(true);
    });
  });
});
