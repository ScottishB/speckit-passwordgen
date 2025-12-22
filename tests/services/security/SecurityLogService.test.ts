/**
 * SecurityLogService Tests
 * 
 * Tests for security event logging functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { Database } from '../../../src/services/database';
import type { SecurityEvent, CreateSecurityEventInput } from '../../../src/models/SecurityEvent';

describe('SecurityLogService', () => {
  let securityLog: SecurityLogService;
  let database: Database;

  // Helper function to create test event
  const createTestEvent = (overrides: Partial<CreateSecurityEventInput> = {}): CreateSecurityEventInput => ({
    userId: 'test-user-id',
    eventType: 'login_success',
    ipAddress: 'local',
    details: 'Test event',
    ...overrides,
  });

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    database = new Database();
    await database.initialize();

    securityLog = new SecurityLogService(database);
  });

  afterEach(async () => {
    await database.close();
    localStorage.clear();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with valid database', () => {
      const service = new SecurityLogService(database);
      expect(service).toBeDefined();
    });

    it('should throw error if database is not provided', () => {
      expect(() => new SecurityLogService(null as any)).toThrow('Database is required');
    });
  });

  // ==========================================================================
  // logEvent() Tests
  // ==========================================================================

  describe('logEvent()', () => {
    it('should log a security event', async () => {
      const event = createTestEvent();

      await securityLog.logEvent(event);

      const events = await securityLog.getUserEvents('test-user-id');
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('login_success');
    });

    it('should generate event ID automatically', async () => {
      const event = createTestEvent();

      await securityLog.logEvent(event);

      const events = await securityLog.getUserEvents('test-user-id');
      expect(events[0]?.id).toBeDefined();
      expect(typeof events[0]?.id).toBe('string');
    });

    it('should generate timestamp automatically', async () => {
      const beforeLog = Date.now();
      const event = createTestEvent();

      await securityLog.logEvent(event);

      const events = await securityLog.getUserEvents('test-user-id');
      const afterLog = Date.now();

      expect(events[0]?.timestamp).toBeGreaterThanOrEqual(beforeLog);
      expect(events[0]?.timestamp).toBeLessThanOrEqual(afterLog);
    });

    it('should accept custom event ID', async () => {
      const customId = 'custom-event-id-123';
      const event = createTestEvent({ id: customId });

      await securityLog.logEvent(event);

      const events = await securityLog.getUserEvents('test-user-id');
      expect(events[0]?.id).toBe(customId);
    });

    it('should accept custom timestamp', async () => {
      const customTimestamp = 1234567890000;
      const event = createTestEvent({ timestamp: customTimestamp });

      await securityLog.logEvent(event);

      const events = await securityLog.getUserEvents('test-user-id');
      expect(events[0]?.timestamp).toBe(customTimestamp);
    });

    it('should throw error if event is not provided', async () => {
      await expect(securityLog.logEvent(null as any)).rejects.toThrow('Event data is required');
    });

    it('should throw error if userId is missing', async () => {
      const event = createTestEvent({ userId: '' });
      await expect(securityLog.logEvent(event)).rejects.toThrow('User ID is required');
    });

    it('should throw error if eventType is missing', async () => {
      const event = createTestEvent({ eventType: '' as any });
      await expect(securityLog.logEvent(event)).rejects.toThrow('Event type is required');
    });

    it('should throw error if ipAddress is missing', async () => {
      const event = createTestEvent({ ipAddress: '' });
      await expect(securityLog.logEvent(event)).rejects.toThrow('IP address is required');
    });

    it('should throw error if details are missing', async () => {
      const event = createTestEvent({ details: '' });
      await expect(securityLog.logEvent(event)).rejects.toThrow('Event details are required');
    });

    it('should log multiple events for same user', async () => {
      await securityLog.logEvent(createTestEvent({ eventType: 'login_success' }));
      await securityLog.logEvent(createTestEvent({ eventType: 'logout' }));
      await securityLog.logEvent(createTestEvent({ eventType: 'password_changed' }));

      const events = await securityLog.getUserEvents('test-user-id');
      expect(events).toHaveLength(3);
    });

    it('should log events for different users', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-2' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-3' }));

      const user1Events = await securityLog.getUserEvents('user-1');
      const user2Events = await securityLog.getUserEvents('user-2');
      const user3Events = await securityLog.getUserEvents('user-3');

      expect(user1Events).toHaveLength(1);
      expect(user2Events).toHaveLength(1);
      expect(user3Events).toHaveLength(1);
    });

    it('should persist events to localStorage', async () => {
      const event = createTestEvent();

      await securityLog.logEvent(event);

      const stored = localStorage.getItem('pwgen_security_events');
      expect(stored).toBeDefined();

      const events = JSON.parse(stored!);
      expect(events).toHaveLength(1);
    });

    it('should log all event types', async () => {
      const eventTypes = [
        'login_success',
        'login_failed',
        'logout',
        'registration',
        '2fa_enabled',
        '2fa_disabled',
        '2fa_failed',
        'session_expired',
        'account_deleted',
        'password_changed',
      ] as const;

      for (const eventType of eventTypes) {
        await securityLog.logEvent(createTestEvent({ userId: `user-${eventType}`, eventType }));
      }

      const stored = localStorage.getItem('pwgen_security_events');
      const events = JSON.parse(stored!);
      expect(events).toHaveLength(eventTypes.length);
    });
  });

  // ==========================================================================
  // getUserEvents() Tests
  // ==========================================================================

  describe('getUserEvents()', () => {
    it('should return empty array when no events exist', async () => {
      const events = await securityLog.getUserEvents('user-no-events');
      expect(events).toEqual([]);
    });

    it('should return all events for a user', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));

      const events = await securityLog.getUserEvents('user-1');
      expect(events).toHaveLength(3);
    });

    it('should only return events for specified user', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-2' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));

      const events = await securityLog.getUserEvents('user-1');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should return events sorted by timestamp descending', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 1000 }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 3000 }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 2000 }));

      const events = await securityLog.getUserEvents('user-1');

      expect(events[0]?.timestamp).toBe(3000);
      expect(events[1]?.timestamp).toBe(2000);
      expect(events[2]?.timestamp).toBe(1000);
    });

    it('should limit results when limit specified', async () => {
      for (let i = 0; i < 10; i++) {
        await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      }

      const events = await securityLog.getUserEvents('user-1', 5);
      expect(events).toHaveLength(5);
    });

    it('should return all events when limit not specified', async () => {
      for (let i = 0; i < 10; i++) {
        await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      }

      const events = await securityLog.getUserEvents('user-1');
      expect(events).toHaveLength(10);
    });

    it('should throw error if userId is not provided', async () => {
      await expect(securityLog.getUserEvents('')).rejects.toThrow('User ID is required');
    });

    it('should handle corrupted localStorage gracefully', async () => {
      localStorage.setItem('pwgen_security_events', 'invalid-json');

      const events = await securityLog.getUserEvents('user-1');
      expect(events).toEqual([]);
    });

    it('should return most recent events when limited', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 1000, details: 'old' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 2000, details: 'newer' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', timestamp: 3000, details: 'newest' }));

      const events = await securityLog.getUserEvents('user-1', 2);

      expect(events).toHaveLength(2);
      expect(events[0]?.details).toBe('newest');
      expect(events[1]?.details).toBe('newer');
    });
  });

  // ==========================================================================
  // getEventsByType() Tests
  // ==========================================================================

  describe('getEventsByType()', () => {
    it('should return events of specific type', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_success' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_failed' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_success' }));

      const events = await securityLog.getEventsByType('user-1', 'login_success');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.eventType === 'login_success')).toBe(true);
    });

    it('should return empty array when no events of type exist', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_success' }));

      const events = await securityLog.getEventsByType('user-1', 'login_failed');
      expect(events).toEqual([]);
    });

    it('should only return events for specified user', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_failed' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-2', eventType: 'login_failed' }));

      const events = await securityLog.getEventsByType('user-1', 'login_failed');
      expect(events).toHaveLength(1);
      expect(events[0]?.userId).toBe('user-1');
    });

    it('should return events sorted by timestamp descending', async () => {
      await securityLog.logEvent(createTestEvent({
        userId: 'user-1',
        eventType: 'logout',
        timestamp: 1000,
      }));
      await securityLog.logEvent(createTestEvent({
        userId: 'user-1',
        eventType: 'logout',
        timestamp: 3000,
      }));
      await securityLog.logEvent(createTestEvent({
        userId: 'user-1',
        eventType: 'logout',
        timestamp: 2000,
      }));

      const events = await securityLog.getEventsByType('user-1', 'logout');

      expect(events[0]?.timestamp).toBe(3000);
      expect(events[1]?.timestamp).toBe(2000);
      expect(events[2]?.timestamp).toBe(1000);
    });

    it('should limit results when limit specified', async () => {
      for (let i = 0; i < 10; i++) {
        await securityLog.logEvent(createTestEvent({ userId: 'user-1', eventType: 'login_success' }));
      }

      const events = await securityLog.getEventsByType('user-1', 'login_success', 3);
      expect(events).toHaveLength(3);
    });

    it('should throw error if userId is not provided', async () => {
      await expect(securityLog.getEventsByType('', 'login_success')).rejects.toThrow('User ID is required');
    });

    it('should throw error if eventType is not provided', async () => {
      await expect(securityLog.getEventsByType('user-1', '' as any)).rejects.toThrow('Event type is required');
    });
  });

  // ==========================================================================
  // clearUserEvents() Tests
  // ==========================================================================

  describe('clearUserEvents()', () => {
    it('should clear all events for a user', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));

      await securityLog.clearUserEvents('user-1');

      const events = await securityLog.getUserEvents('user-1');
      expect(events).toHaveLength(0);
    });

    it('should only clear events for specified user', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-2' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-3' }));

      await securityLog.clearUserEvents('user-1');

      const user1Events = await securityLog.getUserEvents('user-1');
      const user2Events = await securityLog.getUserEvents('user-2');
      const user3Events = await securityLog.getUserEvents('user-3');

      expect(user1Events).toHaveLength(0);
      expect(user2Events).toHaveLength(1);
      expect(user3Events).toHaveLength(1);
    });

    it('should be idempotent (no error if user has no events)', async () => {
      await expect(securityLog.clearUserEvents('user-no-events')).resolves.toBeUndefined();
    });

    it('should throw error if userId is not provided', async () => {
      await expect(securityLog.clearUserEvents('')).rejects.toThrow('User ID is required');
    });

    it('should persist deletion to localStorage', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'user-1' }));
      await securityLog.logEvent(createTestEvent({ userId: 'user-2' }));

      await securityLog.clearUserEvents('user-1');

      const stored = localStorage.getItem('pwgen_security_events');
      const events = JSON.parse(stored!);

      expect(events.some((e: SecurityEvent) => e.userId === 'user-1')).toBe(false);
      expect(events.some((e: SecurityEvent) => e.userId === 'user-2')).toBe(true);
    });

    it('should handle empty localStorage', async () => {
      localStorage.removeItem('pwgen_security_events');

      await expect(securityLog.clearUserEvents('user-1')).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full event lifecycle', async () => {
      // Log events
      await securityLog.logEvent(createTestEvent({ eventType: 'registration' }));
      await securityLog.logEvent(createTestEvent({ eventType: 'login_success' }));
      await securityLog.logEvent(createTestEvent({ eventType: '2fa_enabled' }));

      // Retrieve all events
      let events = await securityLog.getUserEvents('test-user-id');
      expect(events).toHaveLength(3);

      // Filter by type
      const loginEvents = await securityLog.getEventsByType('test-user-id', 'login_success');
      expect(loginEvents).toHaveLength(1);

      // Clear events
      await securityLog.clearUserEvents('test-user-id');
      events = await securityLog.getUserEvents('test-user-id');
      expect(events).toHaveLength(0);
    });

    it('should track login attempts for security audit', async () => {
      const userId = 'audit-user';

      // Simulate login attempts
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'login_failed', details: 'Wrong password' }));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'login_failed', details: 'Wrong password' }));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'login_failed', details: 'Wrong password' }));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'login_success', details: 'Login successful' }));

      const failedLogins = await securityLog.getEventsByType(userId, 'login_failed');
      expect(failedLogins).toHaveLength(3);

      const allEvents = await securityLog.getUserEvents(userId);
      expect(allEvents).toHaveLength(4);
    });

    it('should track account lifecycle events', async () => {
      const userId = 'lifecycle-user';

      await securityLog.logEvent(createTestEvent({ userId, eventType: 'registration' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'login_success' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      await securityLog.logEvent(createTestEvent({ userId, eventType: '2fa_enabled' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'password_changed' }));
      await new Promise(resolve => setTimeout(resolve, 5));
      await securityLog.logEvent(createTestEvent({ userId, eventType: 'logout' }));

      const events = await securityLog.getUserEvents(userId);
      expect(events).toHaveLength(5);

      // Verify order (most recent first)
      expect(events[0]?.eventType).toBe('logout');
      expect(events[4]?.eventType).toBe('registration');
    });

    it('should handle concurrent event logging', async () => {
      const userId = 'concurrent-user';

      const promises = Array.from({ length: 10 }, (_, i) =>
        securityLog.logEvent(createTestEvent({
          userId,
          eventType: 'login_success',
          details: `Concurrent login ${i}`,
        }))
      );

      await Promise.all(promises);

      const events = await securityLog.getUserEvents(userId);
      expect(events).toHaveLength(10);
    });

    it('should persist events across service instances', async () => {
      await securityLog.logEvent(createTestEvent({ userId: 'persist-user' }));

      // Create new service instance
      const newService = new SecurityLogService(database);
      const events = await newService.getUserEvents('persist-user');

      expect(events).toHaveLength(1);
    });

    it('should support large event volumes', async () => {
      const userId = 'high-volume-user';

      // Log 100 events
      for (let i = 0; i < 100; i++) {
        await securityLog.logEvent(createTestEvent({
          userId,
          timestamp: 1000 + i,
          details: `Event ${i}`,
        }));
      }

      const allEvents = await securityLog.getUserEvents(userId);
      expect(allEvents).toHaveLength(100);

      const recentEvents = await securityLog.getUserEvents(userId, 10);
      expect(recentEvents).toHaveLength(10);

      // Verify most recent events returned
      expect(recentEvents[0]?.details).toBe('Event 99');
    });
  });
});
