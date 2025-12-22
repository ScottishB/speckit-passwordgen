/**
 * SessionService Multi-Session Management Tests
 * 
 * Tests for managing multiple sessions per user
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../../../src/services/SessionService';
import { Database } from '../../../src/services/database';

describe('SessionService - Multi-Session Management', () => {
  let sessionService: SessionService;
  let database: Database;

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
  // getUserSessions() Tests
  // ==========================================================================

  describe('getUserSessions()', () => {
    it('should return empty array when user has no sessions', async () => {
      const sessions = await sessionService.getUserSessions('user-no-sessions');

      expect(sessions).toEqual([]);
    });

    it('should return all sessions for a user', async () => {
      const userId = 'user-123';

      await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      const sessions = await sessionService.getUserSessions(userId);

      expect(sessions).toHaveLength(3);
      expect(sessions.every(s => s.userId === userId)).toBe(true);
    });

    it('should only return sessions for specified user', async () => {
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-3');

      const user1Sessions = await sessionService.getUserSessions('user-1');

      expect(user1Sessions).toHaveLength(2);
      expect(user1Sessions.every(s => s.userId === 'user-1')).toBe(true);
    });

    it('should throw error if userId is not provided', async () => {
      await expect(sessionService.getUserSessions('')).rejects.toThrow('User ID is required');
    });

    it('should return sessions with all properties', async () => {
      const userId = 'user-123';
      await sessionService.createSession(userId);

      const sessions = await sessionService.getUserSessions(userId);

      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('userId');
      expect(sessions[0]).toHaveProperty('sessionToken');
      expect(sessions[0]).toHaveProperty('createdAt');
      expect(sessions[0]).toHaveProperty('lastActivity');
      expect(sessions[0]).toHaveProperty('expiresAt');
      expect(sessions[0]).toHaveProperty('deviceInfo');
      expect(sessions[0]).toHaveProperty('ipAddress');
    });

    it('should return sessions in storage order', async () => {
      const userId = 'user-123';
      const session1 = await sessionService.createSession(userId);
      const session2 = await sessionService.createSession(userId);
      const session3 = await sessionService.createSession(userId);

      const sessions = await sessionService.getUserSessions(userId);

      expect(sessions[0]!.id).toBe(session1.id);
      expect(sessions[1]!.id).toBe(session2.id);
      expect(sessions[2]!.id).toBe(session3.id);
    });

    it('should include expired sessions (does not filter)', async () => {
      const userId = 'user-123';
      const session1 = await sessionService.createSession(userId);
      const session2 = await sessionService.createSession(userId);

      // Expire session1
      session1.expiresAt = Date.now() - 1000;
      await database.saveSession(session1);

      const sessions = await sessionService.getUserSessions(userId);

      expect(sessions).toHaveLength(2);
    });

    it('should handle user with many sessions', async () => {
      const userId = 'user-many-sessions';
      const sessionCount = 20;

      for (let i = 0; i < sessionCount; i++) {
        await sessionService.createSession(userId);
      }

      const sessions = await sessionService.getUserSessions(userId);

      expect(sessions).toHaveLength(sessionCount);
    });
  });

  // ==========================================================================
  // invalidateAllUserSessions() Tests
  // ==========================================================================

  describe('invalidateAllUserSessions()', () => {
    it('should delete all sessions for a user', async () => {
      const userId = 'user-123';

      await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      await sessionService.invalidateAllUserSessions(userId);

      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(0);
    });

    it('should only delete sessions for specified user', async () => {
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-3');

      await sessionService.invalidateAllUserSessions('user-1');

      const user1Sessions = await sessionService.getUserSessions('user-1');
      const user2Sessions = await sessionService.getUserSessions('user-2');
      const user3Sessions = await sessionService.getUserSessions('user-3');

      expect(user1Sessions).toHaveLength(0);
      expect(user2Sessions).toHaveLength(1);
      expect(user3Sessions).toHaveLength(1);
    });

    it('should be idempotent (no error if user has no sessions)', async () => {
      await expect(sessionService.invalidateAllUserSessions('user-no-sessions')).resolves.toBeUndefined();
    });

    it('should throw error if userId is not provided', async () => {
      await expect(sessionService.invalidateAllUserSessions('')).rejects.toThrow('User ID is required');
    });

    it('should persist deletion to database', async () => {
      const userId = 'user-123';
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      await sessionService.invalidateAllUserSessions(userId);

      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      const userSessions = sessions.filter((s: any) => s.userId === userId);

      expect(userSessions).toHaveLength(0);
    });

    it('should handle deletion of many sessions', async () => {
      const userId = 'user-many-sessions';
      const sessionCount = 20;

      for (let i = 0; i < sessionCount; i++) {
        await sessionService.createSession(userId);
      }

      await sessionService.invalidateAllUserSessions(userId);

      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle multi-device scenario', async () => {
      const userId = 'multi-device-user';

      // Simulate 3 devices
      const desktopSession = await sessionService.createSession(userId);
      const mobileSession = await sessionService.createSession(userId);
      const tabletSession = await sessionService.createSession(userId);

      // Get all sessions
      let sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(3);

      // Update activity on mobile
      await sessionService.updateActivity(mobileSession.id);

      // Logout from desktop
      await sessionService.invalidateSession(desktopSession.id);
      sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(2);

      // Force logout from all devices
      await sessionService.invalidateAllUserSessions(userId);
      sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(0);
    });

    it('should support password change workflow', async () => {
      const userId = 'user-password-change';

      // User has 3 active sessions
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      // User changes password - logout from all devices
      await sessionService.invalidateAllUserSessions(userId);

      // Verify all sessions are gone
      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(0);

      // User logs in with new password
      const newSession = await sessionService.createSession(userId);
      expect(newSession).toBeDefined();

      const newSessions = await sessionService.getUserSessions(userId);
      expect(newSessions).toHaveLength(1);
    });

    it('should support "logout everywhere" feature', async () => {
      const userId = 'user-logout-everywhere';

      // Create sessions on multiple devices
      const currentDeviceSession = await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      // User clicks "logout everywhere"
      await sessionService.invalidateAllUserSessions(userId);

      // All sessions should be gone
      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(0);

      // Current device session should also be gone
      const retrieved = await sessionService.getSession(currentDeviceSession.id);
      expect(retrieved).toBeNull();
    });

    it('should handle concurrent session operations', async () => {
      const userId = 'concurrent-user';

      // Create multiple sessions concurrently
      const createPromises = Array.from({ length: 5 }, () =>
        sessionService.createSession(userId)
      );
      await Promise.all(createPromises);

      // Get sessions
      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(5);

      // Invalidate all concurrently with new session creation
      const invalidatePromise = sessionService.invalidateAllUserSessions(userId);
      const newSessionPromise = sessionService.createSession(userId);

      await Promise.all([invalidatePromise, newSessionPromise]);

      // Should have 1 session (the new one created)
      const finalSessions = await sessionService.getUserSessions(userId);
      expect(finalSessions.length).toBeGreaterThanOrEqual(0);
      expect(finalSessions.length).toBeLessThanOrEqual(1);
    });

    it('should support session management for multiple users', async () => {
      // Create sessions for 3 different users
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-3');

      // Get sessions per user
      const user1Sessions = await sessionService.getUserSessions('user-1');
      const user2Sessions = await sessionService.getUserSessions('user-2');
      const user3Sessions = await sessionService.getUserSessions('user-3');

      expect(user1Sessions).toHaveLength(2);
      expect(user2Sessions).toHaveLength(3);
      expect(user3Sessions).toHaveLength(1);

      // Invalidate all for user-2
      await sessionService.invalidateAllUserSessions('user-2');

      // Verify only user-2's sessions were deleted
      expect(await sessionService.getUserSessions('user-1')).toHaveLength(2);
      expect(await sessionService.getUserSessions('user-2')).toHaveLength(0);
      expect(await sessionService.getUserSessions('user-3')).toHaveLength(1);
    });

    it('should handle session management after cleanup', async () => {
      const userId = 'user-with-cleanup';

      // Create 3 sessions
      const session1 = await sessionService.createSession(userId);
      const session2 = await sessionService.createSession(userId);
      const session3 = await sessionService.createSession(userId);

      // Expire session2
      session2.expiresAt = Date.now() - 1000;
      await database.saveSession(session2);

      // Cleanup expired sessions
      await sessionService.cleanupExpiredSessions();

      // Get remaining sessions
      const sessions = await sessionService.getUserSessions(userId);
      expect(sessions).toHaveLength(2);
      expect(sessions.some(s => s.id === session1.id)).toBe(true);
      expect(sessions.some(s => s.id === session3.id)).toBe(true);

      // Invalidate all remaining
      await sessionService.invalidateAllUserSessions(userId);
      expect(await sessionService.getUserSessions(userId)).toHaveLength(0);
    });

    it('should persist session changes across database restarts', async () => {
      const userId = 'user-persistence';

      await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await database.close();

      // Reopen database
      const newDb = new Database();
      await newDb.initialize();
      const newService = new SessionService(newDb);

      const sessions = await newService.getUserSessions(userId);
      expect(sessions).toHaveLength(2);

      await newDb.close();
    });

    it('should support viewing active devices', async () => {
      const userId = 'user-view-devices';

      // Create sessions (simulating different devices)
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);
      await sessionService.createSession(userId);

      // User views their active sessions
      const activeSessions = await sessionService.getUserSessions(userId);

      expect(activeSessions).toHaveLength(3);
      activeSessions.forEach(session => {
        expect(session.deviceInfo).toBeDefined();
        expect(session.createdAt).toBeDefined();
        expect(session.lastActivity).toBeDefined();
      });
    });
  });
});
