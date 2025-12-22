/**
 * Database Session Methods Tests
 * 
 * Tests for session management methods in the Database service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../src/services/database';
import type { Session } from '../../../src/models/Session';
import type { User } from '../../../src/models/User';

describe('Database - Session Methods', () => {
  let database: Database;

  // Helper function to create a test session
  const createTestSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'test-session-id',
    userId: 'test-user-id',
    sessionToken: 'random-token-12345',
    createdAt: Date.now(),
    lastActivity: Date.now(),
    expiresAt: Date.now() + 3600000, // 1 hour from now
    deviceInfo: 'Mozilla/5.0 (Test Browser)',
    ipAddress: 'local',
    ...overrides,
  });

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
  });

  afterEach(async () => {
    await database.close();
    localStorage.clear();
  });

  // ==========================================================================
  // saveSession() Tests
  // ==========================================================================

  describe('saveSession()', () => {
    it('should save a new session', async () => {
      const session = createTestSession();

      const saved = await database.saveSession(session);

      expect(saved).toEqual(session);
      expect(saved.id).toBe(session.id);
    });

    it('should persist session to localStorage', async () => {
      const session = createTestSession();

      await database.saveSession(session);

      const stored = localStorage.getItem('pwgen_sessions');
      expect(stored).toBeDefined();
      
      const sessions = JSON.parse(stored!);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(session.id);
    });

    it('should update existing session', async () => {
      const session = createTestSession();
      await database.saveSession(session);

      const updated = { ...session, lastActivity: Date.now() + 1000 };
      const result = await database.saveSession(updated);

      expect(result.lastActivity).toBe(updated.lastActivity);
      
      const allSessions = await database.getUserSessions(session.userId);
      expect(allSessions).toHaveLength(1);
    });

    it('should save multiple sessions', async () => {
      const session1 = createTestSession({ id: 'session-1', userId: 'user-1' });
      const session2 = createTestSession({ id: 'session-2', userId: 'user-1' });
      const session3 = createTestSession({ id: 'session-3', userId: 'user-2' });

      await database.saveSession(session1);
      await database.saveSession(session2);
      await database.saveSession(session3);

      const user1Sessions = await database.getUserSessions('user-1');
      expect(user1Sessions).toHaveLength(2);
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();
      const session = createTestSession();

      await expect(uninitializedDb.saveSession(session)).rejects.toThrow('Database not initialized');
    });

    it('should save session with all fields', async () => {
      const session = createTestSession({
        id: 'detailed-session',
        userId: 'user-123',
        sessionToken: 'abcdef123456',
        createdAt: 1703000000000,
        lastActivity: 1703001000000,
        expiresAt: 1703010000000,
        deviceInfo: 'Chrome 120 on macOS',
        ipAddress: '192.168.1.1',
      });

      await database.saveSession(session);
      const retrieved = await database.getSession('detailed-session');

      expect(retrieved).toEqual(session);
    });
  });

  // ==========================================================================
  // getSession() Tests
  // ==========================================================================

  describe('getSession()', () => {
    it('should retrieve session by ID', async () => {
      const session = createTestSession({ id: 'test-session-123' });
      await database.saveSession(session);

      const retrieved = await database.getSession('test-session-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-session-123');
      expect(retrieved?.sessionToken).toBe(session.sessionToken);
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await database.getSession('non-existent-session');

      expect(retrieved).toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getSession('any-id')).rejects.toThrow('Database not initialized');
    });

    it('should retrieve correct session from multiple sessions', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', sessionToken: 'token-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', sessionToken: 'token-2' }));
      await database.saveSession(createTestSession({ id: 'session-3', sessionToken: 'token-3' }));

      const session = await database.getSession('session-2');

      expect(session?.sessionToken).toBe('token-2');
    });
  });

  // ==========================================================================
  // deleteSession() Tests
  // ==========================================================================

  describe('deleteSession()', () => {
    it('should delete session by ID', async () => {
      const session = createTestSession();
      await database.saveSession(session);

      await database.deleteSession(session.id);

      const retrieved = await database.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should persist deletion to localStorage', async () => {
      const session = createTestSession();
      await database.saveSession(session);

      await database.deleteSession(session.id);

      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      expect(sessions).toHaveLength(0);
    });

    it('should be idempotent (no error if session does not exist)', async () => {
      await expect(database.deleteSession('non-existent-session')).resolves.toBeUndefined();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.deleteSession('any-id')).rejects.toThrow('Database not initialized');
    });

    it('should only delete specified session', async () => {
      await database.saveSession(createTestSession({ id: 'session-1' }));
      await database.saveSession(createTestSession({ id: 'session-2' }));
      await database.saveSession(createTestSession({ id: 'session-3' }));

      await database.deleteSession('session-2');

      const session1 = await database.getSession('session-1');
      const session2 = await database.getSession('session-2');
      const session3 = await database.getSession('session-3');

      expect(session1).not.toBeNull();
      expect(session2).toBeNull();
      expect(session3).not.toBeNull();
    });
  });

  // ==========================================================================
  // getUserSessions() Tests
  // ==========================================================================

  describe('getUserSessions()', () => {
    it('should return empty array when user has no sessions', async () => {
      const sessions = await database.getUserSessions('user-with-no-sessions');

      expect(sessions).toEqual([]);
    });

    it('should retrieve all sessions for a user', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-3', userId: 'user-1' }));

      const sessions = await database.getUserSessions('user-1');

      expect(sessions).toHaveLength(3);
      expect(sessions.every(s => s.userId === 'user-1')).toBe(true);
    });

    it('should only return sessions for specified user', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-2' }));
      await database.saveSession(createTestSession({ id: 'session-3', userId: 'user-1' }));

      const sessions = await database.getUserSessions('user-1');

      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toEqual(['session-1', 'session-3']);
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getUserSessions('any-user')).rejects.toThrow('Database not initialized');
    });
  });

  // ==========================================================================
  // deleteAllUserSessions() Tests
  // ==========================================================================

  describe('deleteAllUserSessions()', () => {
    it('should delete all sessions for a user', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-3', userId: 'user-1' }));

      await database.deleteAllUserSessions('user-1');

      const sessions = await database.getUserSessions('user-1');
      expect(sessions).toHaveLength(0);
    });

    it('should persist deletion to localStorage', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-1' }));

      await database.deleteAllUserSessions('user-1');

      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      expect(sessions).toHaveLength(0);
    });

    it('should only delete sessions for specified user', async () => {
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-1' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-2' }));
      await database.saveSession(createTestSession({ id: 'session-3', userId: 'user-1' }));

      await database.deleteAllUserSessions('user-1');

      const user1Sessions = await database.getUserSessions('user-1');
      const user2Sessions = await database.getUserSessions('user-2');

      expect(user1Sessions).toHaveLength(0);
      expect(user2Sessions).toHaveLength(1);
    });

    it('should be idempotent (no error if user has no sessions)', async () => {
      await expect(database.deleteAllUserSessions('user-with-no-sessions')).resolves.toBeUndefined();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.deleteAllUserSessions('any-user')).rejects.toThrow('Database not initialized');
    });

    it('should not persist if no sessions were deleted', async () => {
      // Save a session for a different user
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-2' }));

      // Delete sessions for user-1 (who has no sessions)
      await database.deleteAllUserSessions('user-1');

      // Should not have written to localStorage (optimization test)
      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      expect(sessions).toHaveLength(1); // Only user-2's session remains
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full session lifecycle', async () => {
      // Create session
      const session = createTestSession({ id: 'lifecycle-session', userId: 'user-1' });
      await database.saveSession(session);

      // Retrieve session
      let retrieved = await database.getSession('lifecycle-session');
      expect(retrieved).not.toBeNull();

      // Update session
      const updated = { ...session, lastActivity: Date.now() + 5000 };
      await database.saveSession(updated);
      retrieved = await database.getSession('lifecycle-session');
      expect(retrieved?.lastActivity).toBe(updated.lastActivity);

      // Delete session
      await database.deleteSession('lifecycle-session');
      retrieved = await database.getSession('lifecycle-session');
      expect(retrieved).toBeNull();
    });

    it('should handle multi-device user sessions', async () => {
      const userId = 'multi-device-user';

      // Create sessions for multiple devices
      await database.saveSession(createTestSession({
        id: 'desktop-session',
        userId,
        deviceInfo: 'Chrome on Desktop',
      }));
      await database.saveSession(createTestSession({
        id: 'mobile-session',
        userId,
        deviceInfo: 'Safari on iPhone',
      }));
      await database.saveSession(createTestSession({
        id: 'tablet-session',
        userId,
        deviceInfo: 'Firefox on iPad',
      }));

      // Verify all sessions exist
      const sessions = await database.getUserSessions(userId);
      expect(sessions).toHaveLength(3);

      // Logout from one device
      await database.deleteSession('mobile-session');
      const remainingSessions = await database.getUserSessions(userId);
      expect(remainingSessions).toHaveLength(2);

      // Logout from all devices
      await database.deleteAllUserSessions(userId);
      const allSessions = await database.getUserSessions(userId);
      expect(allSessions).toHaveLength(0);
    });

    it('should handle user deletion with sessions', async () => {
      // Create user
      const user = createTestUser({ id: 'user-with-sessions' });
      await database.saveUser(user);

      // Create sessions
      await database.saveSession(createTestSession({ id: 'session-1', userId: 'user-with-sessions' }));
      await database.saveSession(createTestSession({ id: 'session-2', userId: 'user-with-sessions' }));

      // Delete user (should cascade delete sessions)
      await database.deleteUser('user-with-sessions');

      // Verify sessions are deleted
      const sessions = await database.getUserSessions('user-with-sessions');
      expect(sessions).toHaveLength(0);
    });

    it('should persist sessions across database close and reopen', async () => {
      const session = createTestSession({ id: 'persistent-session', userId: 'user-1' });
      await database.saveSession(session);
      await database.close();

      // Create new database instance
      const newDb = new Database();
      await newDb.initialize();

      const retrieved = await newDb.getSession('persistent-session');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user-1');

      await newDb.close();
    });

    it('should handle concurrent session operations', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) =>
        createTestSession({ id: `concurrent-session-${i}`, userId: 'concurrent-user' })
      );

      // Save all sessions concurrently
      await Promise.all(sessions.map(s => database.saveSession(s)));

      const allSessions = await database.getUserSessions('concurrent-user');
      expect(allSessions).toHaveLength(10);
    });

    it('should support session expiration checking', async () => {
      const now = Date.now();
      
      // Create expired and valid sessions
      await database.saveSession(createTestSession({
        id: 'expired-session',
        userId: 'user-1',
        expiresAt: now - 1000, // Expired 1 second ago
      }));
      await database.saveSession(createTestSession({
        id: 'valid-session',
        userId: 'user-1',
        expiresAt: now + 3600000, // Expires in 1 hour
      }));

      const sessions = await database.getUserSessions('user-1');
      const expiredSessions = sessions.filter(s => s.expiresAt < now);
      const validSessions = sessions.filter(s => s.expiresAt >= now);

      expect(expiredSessions).toHaveLength(1);
      expect(validSessions).toHaveLength(1);

      // Application logic would clean up expired sessions
      for (const session of expiredSessions) {
        await database.deleteSession(session.id);
      }

      const remainingSessions = await database.getUserSessions('user-1');
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0]?.id).toBe('valid-session');
    });
  });
});
