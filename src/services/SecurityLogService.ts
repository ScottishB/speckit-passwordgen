/**
 * SecurityLogService
 * 
 * Manages security event logging for audit trails and compliance.
 * Implements OWASP ASVS 4.0 logging requirements.
 */

import type { SecurityEvent, SecurityEventType, CreateSecurityEventInput } from '../models/SecurityEvent';
import type { Database } from './database';

/**
 * SecurityLogService class for managing security event logging
 * 
 * Features:
 * - Audit trail of security-sensitive actions
 * - Event filtering by type
 * - Event history limits to prevent storage bloat
 * - User-scoped event storage
 * 
 * @example
 * ```typescript
 * const securityLog = new SecurityLogService(database);
 * 
 * // Log a login event
 * await securityLog.logEvent({
 *   userId: 'user-123',
 *   eventType: 'login_success',
 *   ipAddress: 'local',
 *   details: 'User logged in successfully'
 * });
 * 
 * // Get recent events
 * const events = await securityLog.getUserEvents('user-123', 10);
 * ```
 */
export class SecurityLogService {
  private database: Database;

  /**
   * Creates a new SecurityLogService instance
   * 
   * @param database - Database instance for event persistence
   * @throws {Error} If database is not provided
   */
  constructor(database: Database) {
    if (!database) {
      throw new Error('Database is required');
    }

    this.database = database;
  }

  /**
   * Logs a security event
   * 
   * Creates a security event with automatic ID and timestamp generation.
   * Events are stored in the database for audit trails.
   * 
   * @param event - Security event data (without id and timestamp)
   * @throws {Error} If event data is invalid
   * 
   * @example
   * ```typescript
   * await securityLog.logEvent({
   *   userId: 'user-123',
   *   eventType: 'login_failed',
   *   ipAddress: '192.168.1.1',
   *   details: 'Invalid password'
   * });
   * ```
   */
  async logEvent(event: CreateSecurityEventInput): Promise<void> {
    if (!event) {
      throw new Error('Event data is required');
    }

    if (!event.userId) {
      throw new Error('User ID is required');
    }

    if (!event.eventType) {
      throw new Error('Event type is required');
    }

    if (!event.ipAddress) {
      throw new Error('IP address is required');
    }

    if (!event.details) {
      throw new Error('Event details are required');
    }

    const securityEvent: SecurityEvent = {
      id: event.id || this.generateEventId(),
      userId: event.userId,
      eventType: event.eventType,
      timestamp: event.timestamp || Date.now(),
      ipAddress: event.ipAddress,
      details: event.details,
    };

    // Get existing events
    const events = await this.getUserEvents(securityEvent.userId);
    events.push(securityEvent);

    // Store events in localStorage
    await this.saveEvents(events);
  }

  /**
   * Gets security events for a specific user
   * 
   * Returns security events ordered by timestamp (most recent first).
   * Can optionally limit the number of events returned.
   * 
   * @param userId - User ID to get events for
   * @param limit - Maximum number of events to return (optional)
   * @returns Promise resolving to array of security events
   * @throws {Error} If userId is not provided
   * 
   * @example
   * ```typescript
   * // Get last 10 events
   * const recentEvents = await securityLog.getUserEvents('user-123', 10);
   * 
   * // Get all events
   * const allEvents = await securityLog.getUserEvents('user-123');
   * ```
   */
  async getUserEvents(userId: string, limit?: number): Promise<SecurityEvent[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const stored = localStorage.getItem('pwgen_security_events');
      if (!stored) {
        return [];
      }

      const allEvents: SecurityEvent[] = JSON.parse(stored);
      let userEvents = allEvents.filter(event => event.userId === userId);

      // Sort by timestamp descending (most recent first)
      userEvents.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit if specified
      if (limit && limit > 0) {
        userEvents = userEvents.slice(0, limit);
      }

      return userEvents;
    } catch (error) {
      console.error('[SecurityLogService] Failed to load user events:', error);
      return [];
    }
  }

  /**
   * Gets security events of a specific type for a user
   * 
   * Filters events by both user ID and event type, ordered by timestamp
   * (most recent first). Useful for tracking specific security actions.
   * 
   * @param userId - User ID to get events for
   * @param eventType - Type of events to filter by
   * @param limit - Maximum number of events to return (optional)
   * @returns Promise resolving to array of filtered security events
   * @throws {Error} If userId or eventType is not provided
   * 
   * @example
   * ```typescript
   * // Get last 5 failed login attempts
   * const failedLogins = await securityLog.getEventsByType(
   *   'user-123',
   *   'login_failed',
   *   5
   * );
   * ```
   */
  async getEventsByType(
    userId: string,
    eventType: SecurityEventType,
    limit?: number
  ): Promise<SecurityEvent[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!eventType) {
      throw new Error('Event type is required');
    }

    const userEvents = await this.getUserEvents(userId);
    let filteredEvents = userEvents.filter(event => event.eventType === eventType);

    // Apply limit if specified
    if (limit && limit > 0) {
      filteredEvents = filteredEvents.slice(0, limit);
    }

    return filteredEvents;
  }

  /**
   * Clears all security events for a specific user
   * 
   * Removes all security events for the given user from the database.
   * This is typically used during account deletion or when resetting audit logs.
   * 
   * @param userId - User ID to clear events for
   * @throws {Error} If userId is not provided
   * 
   * @example
   * ```typescript
   * // Clear all events for user (e.g., during account deletion)
   * await securityLog.clearUserEvents('user-123');
   * ```
   */
  async clearUserEvents(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const stored = localStorage.getItem('pwgen_security_events');
      if (!stored) {
        return;
      }

      const allEvents: SecurityEvent[] = JSON.parse(stored);
      const remainingEvents = allEvents.filter(event => event.userId !== userId);

      localStorage.setItem('pwgen_security_events', JSON.stringify(remainingEvents));
    } catch (error) {
      console.error('[SecurityLogService] Failed to clear user events:', error);
      throw new Error('Failed to clear security events');
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Generates a unique event ID
   * 
   * @returns UUID v4 string
   * @private
   */
  private generateEventId(): string {
    return crypto.randomUUID();
  }

  /**
   * Saves all events to localStorage
   * 
   * @param events - Array of all security events to save
   * @private
   */
  private async saveEvents(events: SecurityEvent[]): Promise<void> {
    try {
      localStorage.setItem('pwgen_security_events', JSON.stringify(events));
    } catch (error) {
      console.error('[SecurityLogService] Failed to save events:', error);
      throw new Error('Failed to save security events');
    }
  }
}
