/**
 * SessionService Cleanup Tests
 * 
 * Tests for automatic session cleanup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionService, SESSION_TIMEOUTS } from '../../../src/services/SessionService';
import { Database } from '../../../src/services/database';

describe('SessionService - Automatic Cleanup', () => {
  let sessionService: SessionService;
  let database: Database;

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    database = new Database();
    await database.initialize();

    sessionService = new SessionService(database);

    // Use fake timers for setInterval testing
    vi.useFakeTimers();
  });

  afterEach(async () => {
    // Stop any running cleanup intervals
    sessionService.stopExpirationCheck();
    
    await database.close();
    localStorage.clear();

    // Restore real timers
    vi.useRealTimers();
  });

  // ==========================================================================
  // cleanupExpiredSessions() Tests
  // ==========================================================================

  describe('cleanupExpiredSessions()', () => {
    it('should return 0 when no sessions exist', async () => {
      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });

    it('should not delete valid sessions', async () => {
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-3');

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
      
      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      expect(sessions).toHaveLength(3);
    });

    it('should delete expired sessions (idle timeout)', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-2');
      const session3 = await sessionService.createSession('user-3');

      // Expire session2 by setting lastActivity to 31 minutes ago
      session2.lastActivity = Date.now() - (31 * 60 * 1000);
      await database.saveSession(session2);

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(1);
      
      // Verify only session2 was deleted
      const retrieved1 = await sessionService.getSession(session1.id);
      const retrieved2 = await sessionService.getSession(session2.id);
      const retrieved3 = await sessionService.getSession(session3.id);

      expect(retrieved1).not.toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrieved3).not.toBeNull();
    });

    it('should delete expired sessions (absolute timeout)', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-2');

      // Expire session1 by setting expiresAt to past
      session1.expiresAt = Date.now() - 1000;
      await database.saveSession(session1);

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(1);
      
      const retrieved1 = await sessionService.getSession(session1.id);
      const retrieved2 = await sessionService.getSession(session2.id);

      expect(retrieved1).toBeNull();
      expect(retrieved2).not.toBeNull();
    });

    it('should delete all expired sessions', async () => {
      await sessionService.createSession('user-1');
      await sessionService.createSession('user-2');
      await sessionService.createSession('user-3');
      await sessionService.createSession('user-4');
      await sessionService.createSession('user-5');

      // Expire all sessions
      const stored = localStorage.getItem('pwgen_sessions');
      const sessions = JSON.parse(stored!);
      for (const session of sessions) {
        session.expiresAt = Date.now() - 1000;
      }
      localStorage.setItem('pwgen_sessions', JSON.stringify(sessions));

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(5);
      
      const remaining = localStorage.getItem('pwgen_sessions');
      const remainingSessions = JSON.parse(remaining!);
      expect(remainingSessions).toHaveLength(0);
    });

    it('should delete mix of expired sessions', async () => {
      const session1 = await sessionService.createSession('user-1');
      const session2 = await sessionService.createSession('user-2');
      const session3 = await sessionService.createSession('user-3');
      const session4 = await sessionService.createSession('user-4');

      // Expire session1 (idle timeout)
      session1.lastActivity = Date.now() - (31 * 60 * 1000);
      await database.saveSession(session1);

      // Expire session3 (absolute timeout)
      session3.expiresAt = Date.now() - 1000;
      await database.saveSession(session3);

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(2);
      
      const retrieved1 = await sessionService.getSession(session1.id);
      const retrieved2 = await sessionService.getSession(session2.id);
      const retrieved3 = await sessionService.getSession(session3.id);
      const retrieved4 = await sessionService.getSession(session4.id);

      expect(retrieved1).toBeNull();
      expect(retrieved2).not.toBeNull();
      expect(retrieved3).toBeNull();
      expect(retrieved4).not.toBeNull();
    });

    it('should return 0 if localStorage is corrupted', async () => {
      localStorage.setItem('pwgen_sessions', 'invalid-json');

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });

    it('should handle empty sessions array', async () => {
      localStorage.setItem('pwgen_sessions', '[]');

      const deletedCount = await sessionService.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });
  });

  // ==========================================================================
  // startExpirationCheck() Tests
  // ==========================================================================

  describe('startExpirationCheck()', () => {
    it('should start cleanup interval', () => {
      sessionService.startExpirationCheck();

      // Verify interval was created (internal state check)
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should not create multiple intervals', () => {
      sessionService.startExpirationCheck();
      const timerCount1 = vi.getTimerCount();

      sessionService.startExpirationCheck();
      sessionService.startExpirationCheck();
      const timerCount2 = vi.getTimerCount();

      expect(timerCount1).toBe(timerCount2);
    });

    it('should run cleanup at 30-second intervals', async () => {
      // Create expired session
      const session = await sessionService.createSession('user-1');
      session.expiresAt = Date.now() - 1000;
      await database.saveSession(session);

      sessionService.startExpirationCheck();

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Session should be cleaned up
      const retrieved = await sessionService.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should run cleanup multiple times', async () => {
      sessionService.startExpirationCheck();

      // Create expired session before first cleanup
      let session1 = await sessionService.createSession('user-1');
      session1.expiresAt = Date.now() - 1000;
      await database.saveSession(session1);

      // First cleanup (30 seconds)
      await vi.advanceTimersByTimeAsync(30000);
      let retrieved1 = await sessionService.getSession(session1.id);
      expect(retrieved1).toBeNull();

      // Create another expired session before second cleanup
      let session2 = await sessionService.createSession('user-2');
      session2.expiresAt = Date.now() - 1000;
      await database.saveSession(session2);

      // Second cleanup (60 seconds total)
      await vi.advanceTimersByTimeAsync(30000);
      let retrieved2 = await sessionService.getSession(session2.id);
      expect(retrieved2).toBeNull();
    });

    it('should handle cleanup errors gracefully', async () => {
      sessionService.startExpirationCheck();

      // Create corrupted localStorage
      localStorage.setItem('pwgen_sessions', 'invalid-json');

      // Fast-forward - should not throw
      await expect(vi.advanceTimersByTimeAsync(30000)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // stopExpirationCheck() Tests
  // ==========================================================================

  describe('stopExpirationCheck()', () => {
    it('should stop cleanup interval', () => {
      sessionService.startExpirationCheck();
      const timerCountBefore = vi.getTimerCount();
      expect(timerCountBefore).toBeGreaterThan(0);

      sessionService.stopExpirationCheck();
      const timerCountAfter = vi.getTimerCount();
      expect(timerCountAfter).toBe(0);
    });

    it('should not error if no interval is running', () => {
      expect(() => sessionService.stopExpirationCheck()).not.toThrow();
    });

    it('should prevent cleanup from running after stop', async () => {
      const session = await sessionService.createSession('user-1');
      session.expiresAt = Date.now() - 1000;
      await database.saveSession(session);

      sessionService.startExpirationCheck();
      sessionService.stopExpirationCheck();

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Session should NOT be cleaned up
      const retrieved = await sessionService.getSession(session.id);
      expect(retrieved).not.toBeNull();
    });

    it('should be idempotent', () => {
      sessionService.startExpirationCheck();
      
      expect(() => {
        sessionService.stopExpirationCheck();
        sessionService.stopExpirationCheck();
        sessionService.stopExpirationCheck();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle start/stop/start cycle', async () => {
      const session1 = await sessionService.createSession('user-1');
      session1.expiresAt = Date.now() - 1000;
      await database.saveSession(session1);

      // Start cleanup
      sessionService.startExpirationCheck();
      await vi.advanceTimersByTimeAsync(30000);
      expect(await sessionService.getSession(session1.id)).toBeNull();

      // Stop cleanup
      sessionService.stopExpirationCheck();

      // Create another expired session
      const session2 = await sessionService.createSession('user-2');
      session2.expiresAt = Date.now() - 1000;
      await database.saveSession(session2);

      // Should not be cleaned up (cleanup stopped)
      await vi.advanceTimersByTimeAsync(30000);
      expect(await sessionService.getSession(session2.id)).not.toBeNull();

      // Start cleanup again
      sessionService.startExpirationCheck();
      await vi.advanceTimersByTimeAsync(30000);
      expect(await sessionService.getSession(session2.id)).toBeNull();
    });

    it('should cleanup expired sessions while keeping valid ones', async () => {
      const validSession1 = await sessionService.createSession('user-1');
      const expiredSession = await sessionService.createSession('user-2');
      const validSession2 = await sessionService.createSession('user-3');

      // Expire middle session
      expiredSession.expiresAt = Date.now() - 1000;
      await database.saveSession(expiredSession);

      sessionService.startExpirationCheck();
      await vi.advanceTimersByTimeAsync(30000);

      expect(await sessionService.getSession(validSession1.id)).not.toBeNull();
      expect(await sessionService.getSession(expiredSession.id)).toBeNull();
      expect(await sessionService.getSession(validSession2.id)).not.toBeNull();
    });

    it('should respect cleanup interval timing', async () => {
      const session = await sessionService.createSession('user-1');
      session.expiresAt = Date.now() - 1000;
      await database.saveSession(session);

      sessionService.startExpirationCheck();

      // Not cleaned up yet (only 15 seconds)
      await vi.advanceTimersByTimeAsync(15000);
      expect(await sessionService.getSession(session.id)).not.toBeNull();

      // Cleaned up after full 30 seconds
      await vi.advanceTimersByTimeAsync(15000);
      expect(await sessionService.getSession(session.id)).toBeNull();
    });

    it('should handle concurrent session operations during cleanup', async () => {
      sessionService.startExpirationCheck();

      // Create multiple sessions
      const sessions = await Promise.all([
        sessionService.createSession('user-1'),
        sessionService.createSession('user-2'),
        sessionService.createSession('user-3'),
      ]);

      // Expire first session
      sessions[0].expiresAt = Date.now() - 1000;
      await database.saveSession(sessions[0]);

      // Trigger cleanup
      await vi.advanceTimersByTimeAsync(30000);

      // Create new session while cleanup is running
      const newSession = await sessionService.createSession('user-4');

      // Verify state
      expect(await sessionService.getSession(sessions[0].id)).toBeNull();
      expect(await sessionService.getSession(sessions[1].id)).not.toBeNull();
      expect(await sessionService.getSession(sessions[2].id)).not.toBeNull();
      expect(await sessionService.getSession(newSession.id)).not.toBeNull();
    });
  });
});
