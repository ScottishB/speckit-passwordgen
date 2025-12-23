/**
 * SessionService Timeout Logic Tests
 * 
 * Tests for session expiration checking (idle and absolute timeouts)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService, SESSION_TIMEOUTS } from '../../../src/services/SessionService';
import { Database } from '../../../src/services/database';
import type { Session } from '../../../src/models/Session';

describe('SessionService - Timeout Logic', () => {
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
  // isSessionExpired() Tests
  // ==========================================================================

  describe('isSessionExpired()', () => {
    it('should return false for valid active session', async () => {
      const session = await sessionService.createSession('user-123');

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(false);
    });

    it('should return true when absolute timeout exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Manually set expiresAt to past time
      session.expiresAt = Date.now() - 1000; // Expired 1 second ago
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should return true when idle timeout exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Manually set lastActivity to past time (31 minutes ago)
      session.lastActivity = Date.now() - (31 * 60 * 1000);
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should return false when idle timeout not exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set lastActivity to 29 minutes ago (still valid)
      session.lastActivity = Date.now() - (29 * 60 * 1000);
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(false);
    });

    it('should return false when absolute timeout not exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set expiresAt to future time (7 hours from now)
      session.expiresAt = Date.now() + (7 * 60 * 60 * 1000);
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(false);
    });

    it('should throw error if session is not provided', () => {
      expect(() => sessionService.isSessionExpired(null as any)).toThrow('Session is required');
    });

    it('should return true at exact idle timeout boundary', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set lastActivity to exactly 30 minutes ago
      session.lastActivity = Date.now() - SESSION_TIMEOUTS.IDLE_TIMEOUT;
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should return true at exact absolute timeout boundary', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set expiresAt to exactly now
      session.expiresAt = Date.now();
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should prioritize absolute timeout over idle timeout', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set both to expired
      session.lastActivity = Date.now() - (31 * 60 * 1000); // Idle timeout exceeded
      session.expiresAt = Date.now() - 1000; // Absolute timeout exceeded
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should return true if only idle timeout exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Idle timeout exceeded, but absolute timeout valid
      session.lastActivity = Date.now() - (31 * 60 * 1000);
      session.expiresAt = Date.now() + (7 * 60 * 60 * 1000); // Still 7 hours left
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should return true if only absolute timeout exceeded', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Absolute timeout exceeded, but idle timeout valid
      session.lastActivity = Date.now() - (5 * 60 * 1000); // Only 5 minutes idle
      session.expiresAt = Date.now() - 1000; // Expired
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(true);
    });

    it('should handle recently updated session', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Simulate activity update (just now)
      await sessionService.updateActivity(session.id);
      const updated = await sessionService.getSession(session.id);

      const isExpired = sessionService.isSessionExpired(updated!);

      expect(isExpired).toBe(false);
    });

    it('should correctly evaluate session with maximum valid idle time', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set lastActivity to just under 30 minutes (29:59)
      session.lastActivity = Date.now() - (SESSION_TIMEOUTS.IDLE_TIMEOUT - 1000);
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(false);
    });

    it('should correctly evaluate session with maximum valid absolute time', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set expiresAt to just in the future (1 second)
      session.expiresAt = Date.now() + 1000;
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      expect(isExpired).toBe(false);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should detect expired session in typical authentication flow', async () => {
      // Create session
      const session = await sessionService.createSession('user-123');
      
      // Simulate time passing (31 minutes)
      session.lastActivity = Date.now() - (31 * 60 * 1000);
      await database.saveSession(session);

      // Try to authenticate
      const retrieved = await sessionService.getSession(session.id);
      const isExpired = sessionService.isSessionExpired(retrieved!);

      expect(isExpired).toBe(true);
      
      // Should invalidate expired session
      await sessionService.invalidateSession(session.id);
      const afterInvalidate = await sessionService.getSession(session.id);
      expect(afterInvalidate).toBeNull();
    });

    it('should keep session alive with regular activity', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Simulate regular activity every 15 minutes (should keep session alive)
      const activities = [0, 15, 30, 45, 60]; // Minutes
      
      for (const minutes of activities) {
        // Set time to current + minutes
        session.lastActivity = Date.now() - (minutes * 60 * 1000);
        await database.saveSession(session);
        
        const retrieved = await sessionService.getSession(session.id);
        const isExpired = sessionService.isSessionExpired(retrieved!);
        
        // Should not be expired if within 30 minutes
        if (minutes < 30) {
          expect(isExpired).toBe(false);
        } else {
          expect(isExpired).toBe(true);
        }
      }
    });

    it('should expire session after 8 hours regardless of activity', async () => {
      const session = await sessionService.createSession('user-123');
      
      // Set session created 8 hours ago
      const eightHoursAgo = Date.now() - (8 * 60 * 60 * 1000);
      session.createdAt = eightHoursAgo;
      session.expiresAt = eightHoursAgo + SESSION_TIMEOUTS.ABSOLUTE_TIMEOUT;
      
      // But activity was recent (keeps idle timeout valid)
      session.lastActivity = Date.now() - (5 * 60 * 1000);
      await database.saveSession(session);

      const isExpired = sessionService.isSessionExpired(session);

      // Should be expired due to absolute timeout
      expect(isExpired).toBe(true);
    });

    it('should handle multiple sessions with different expiration states', async () => {
      // Create multiple sessions
      const activeSession = await sessionService.createSession('user-1');
      const idleExpiredSession = await sessionService.createSession('user-2');
      const absoluteExpiredSession = await sessionService.createSession('user-3');
      
      // Set up different expiration states
      idleExpiredSession.lastActivity = Date.now() - (31 * 60 * 1000);
      await database.saveSession(idleExpiredSession);
      
      absoluteExpiredSession.expiresAt = Date.now() - 1000;
      await database.saveSession(absoluteExpiredSession);

      // Check expiration states
      expect(sessionService.isSessionExpired(activeSession)).toBe(false);
      expect(sessionService.isSessionExpired(idleExpiredSession)).toBe(true);
      expect(sessionService.isSessionExpired(absoluteExpiredSession)).toBe(true);
    });

    it('should validate timeout constants are correct', () => {
      expect(sessionService.getIdleTimeout()).toBe(30 * 60 * 1000); // 30 minutes
      expect(sessionService.getAbsoluteTimeout()).toBe(8 * 60 * 60 * 1000); // 8 hours
      expect(sessionService.getCleanupInterval()).toBe(30 * 1000); // 30 seconds
    });

    it('should handle edge case of session at exact expiration time', async () => {
      const session = await sessionService.createSession('user-123');
      const now = Date.now();
      
      // Test idle timeout boundary
      session.lastActivity = now - SESSION_TIMEOUTS.IDLE_TIMEOUT;
      expect(sessionService.isSessionExpired(session)).toBe(true);
      
      // Test absolute timeout boundary
      session.lastActivity = now; // Reset idle
      session.expiresAt = now;
      expect(sessionService.isSessionExpired(session)).toBe(true);
    });
  });
});
