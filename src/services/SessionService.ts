/**
 * SessionService
 * 
 * Manages user sessions with timeout enforcement and automatic cleanup.
 * Implements OWASP ASVS 4.0 session management requirements.
 */

import type { Session } from '../models/Session';
import type { Database } from './database';
import { CryptoService } from './CryptoService';

/**
 * Session timeout constants (in milliseconds)
 */
export const SESSION_TIMEOUTS = {
  /**
   * Idle timeout: Maximum time of inactivity before session expires
   * OWASP recommendation: 15-30 minutes for sensitive applications
   */
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  /**
   * Absolute timeout: Maximum session lifetime regardless of activity
   * OWASP recommendation: 2-8 hours for web applications
   */
  ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours

  /**
   * Cleanup interval: How often to check for expired sessions
   */
  CLEANUP_INTERVAL: 30 * 1000, // 30 seconds
} as const;

/**
 * SessionService class for managing user authentication sessions
 * 
 * Features:
 * - Session creation with cryptographically random tokens
 * - Idle and absolute timeout enforcement
 * - Automatic cleanup of expired sessions
 * - Multi-device session management
 * - Session activity tracking
 * 
 * @example
 * ```typescript
 * const sessionService = new SessionService(database);
 * 
 * // Create a new session
 * const session = await sessionService.createSession('user-123');
 * 
 * // Check if session is valid
 * const currentSession = await sessionService.getSession(session.id);
 * if (currentSession && !sessionService.isSessionExpired(currentSession)) {
 *   // Session is valid, update activity
 *   await sessionService.updateActivity(session.id);
 * }
 * 
 * // Start automatic cleanup
 * sessionService.startExpirationCheck();
 * ```
 */
export class SessionService {
  private database: Database;
  private cryptoService: CryptoService;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  /**
   * Creates a new SessionService instance
   * 
   * @param database - Database instance for session persistence
   * @throws {Error} If database is not provided
   */
  constructor(database: Database) {
    if (!database) {
      throw new Error('Database is required');
    }

    this.database = database;
    this.cryptoService = new CryptoService();
  }

  /**
   * Gets the idle timeout duration in milliseconds
   * 
   * @returns Idle timeout in milliseconds (30 minutes)
   */
  getIdleTimeout(): number {
    return SESSION_TIMEOUTS.IDLE_TIMEOUT;
  }

  /**
   * Gets the absolute timeout duration in milliseconds
   * 
   * @returns Absolute timeout in milliseconds (8 hours)
   */
  getAbsoluteTimeout(): number {
    return SESSION_TIMEOUTS.ABSOLUTE_TIMEOUT;
  }

  /**
   * Gets the cleanup interval duration in milliseconds
   * 
   * @returns Cleanup interval in milliseconds (30 seconds)
   */
  getCleanupInterval(): number {
    return SESSION_TIMEOUTS.CLEANUP_INTERVAL;
  }

  // ==========================================================================
  // Session Lifecycle Methods
  // ==========================================================================

  /**
   * Creates a new session for a user
   * 
   * Generates a cryptographically secure session token and stores the session
   * in the database. The session will have idle and absolute timeout enforced.
   * 
   * @param userId - User ID to create session for
   * @returns Promise resolving to the created session
   * @throws {Error} If userId is not provided or session creation fails
   * 
   * @example
   * ```typescript
   * const session = await sessionService.createSession('user-123');
   * console.log('Session created:', session.id);
   * ```
   */
  async createSession(userId: string): Promise<Session> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const now = Date.now();
    const sessionId = this.cryptoService.generateUUID();
    const sessionToken = this.cryptoService.generateToken(32);

    const session: Session = {
      id: sessionId,
      userId,
      sessionToken,
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SESSION_TIMEOUTS.ABSOLUTE_TIMEOUT,
      deviceInfo: this.getDeviceInfo(),
      ipAddress: this.getIpAddress(),
    };

    await this.database.saveSession(session);
    return session;
  }

  /**
   * Retrieves a session by ID
   * 
   * @param sessionId - Session ID to retrieve
   * @returns Promise resolving to the session, or null if not found
   * @throws {Error} If sessionId is not provided
   * 
   * @example
   * ```typescript
   * const session = await sessionService.getSession('session-123');
   * if (session) {
   *   console.log('Session found for user:', session.userId);
   * }
   * ```
   */
  async getSession(sessionId: string): Promise<Session | null> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    return await this.database.getSession(sessionId);
  }

  /**
   * Updates the last activity timestamp for a session
   * 
   * This resets the idle timeout but does not extend the absolute timeout.
   * Should be called on each authenticated request to keep the session alive.
   * 
   * @param sessionId - Session ID to update
   * @throws {Error} If sessionId is not provided or session not found
   * 
   * @example
   * ```typescript
   * await sessionService.updateActivity('session-123');
   * ```
   */
  async updateActivity(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const session = await this.database.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();
    await this.database.saveSession(session);
  }

  /**
   * Invalidates (deletes) a session
   * 
   * This is used for explicit logout. The session is permanently removed
   * from the database.
   * 
   * @param sessionId - Session ID to invalidate
   * @throws {Error} If sessionId is not provided
   * 
   * @example
   * ```typescript
   * await sessionService.invalidateSession('session-123');
   * console.log('User logged out');
   * ```
   */
  async invalidateSession(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    await this.database.deleteSession(sessionId);
  }

  // ==========================================================================
  // Session Timeout Logic
  // ==========================================================================

  /**
   * Checks if a session has expired
   * 
   * A session is considered expired if either:
   * - Idle timeout: No activity for 30 minutes (lastActivity + IDLE_TIMEOUT < now)
   * - Absolute timeout: Session exists for 8 hours (expiresAt < now)
   * 
   * @param session - Session to check
   * @returns True if session is expired, false otherwise
   * @throws {Error} If session is not provided
   * 
   * @example
   * ```typescript
   * const session = await sessionService.getSession('session-123');
   * if (session && sessionService.isSessionExpired(session)) {
   *   await sessionService.invalidateSession(session.id);
   *   throw new Error('Session expired');
   * }
   * ```
   */
  isSessionExpired(session: Session): boolean {
    if (!session) {
      throw new Error('Session is required');
    }

    const now = Date.now();

    // Check absolute timeout (session exists too long)
    if (now >= session.expiresAt) {
      return true;
    }

    // Check idle timeout (no activity for too long)
    const idleTime = now - session.lastActivity;
    if (idleTime >= SESSION_TIMEOUTS.IDLE_TIMEOUT) {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // Automatic Session Cleanup
  // ==========================================================================

  /**
   * Starts automatic cleanup of expired sessions
   * 
   * Runs cleanupExpiredSessions() every 30 seconds to remove expired sessions
   * from the database. This helps maintain database hygiene and security.
   * 
   * Note: Only one cleanup interval can be active at a time. Calling this
   * method multiple times will not create multiple intervals.
   * 
   * @example
   * ```typescript
   * // Start cleanup when app initializes
   * sessionService.startExpirationCheck();
   * 
   * // Stop cleanup when app closes
   * window.addEventListener('beforeunload', () => {
   *   sessionService.stopExpirationCheck();
   * });
   * ```
   */
  startExpirationCheck(): void {
    // Don't create multiple intervals
    if (this.cleanupIntervalId) {
      return;
    }

    this.cleanupIntervalId = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('[SessionService] Failed to cleanup expired sessions:', error);
      }
    }, SESSION_TIMEOUTS.CLEANUP_INTERVAL);
  }

  /**
   * Stops automatic cleanup of expired sessions
   * 
   * Clears the cleanup interval started by startExpirationCheck().
   * Should be called when the application is shutting down or when
   * session management is no longer needed.
   * 
   * @example
   * ```typescript
   * sessionService.stopExpirationCheck();
   * ```
   */
  stopExpirationCheck(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Cleans up all expired sessions from the database
   * 
   * Iterates through all stored sessions and deletes those that have
   * expired (either idle timeout or absolute timeout exceeded).
   * 
   * @returns Promise resolving to the number of sessions deleted
   * 
   * @example
   * ```typescript
   * const deletedCount = await sessionService.cleanupExpiredSessions();
   * console.log(`Cleaned up ${deletedCount} expired sessions`);
   * ```
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // Get all sessions from localStorage
      const sessionsData = localStorage.getItem('pwgen_sessions');
      if (!sessionsData) {
        return 0;
      }

      const sessions: Session[] = JSON.parse(sessionsData);
      const expiredSessions = sessions.filter(session => this.isSessionExpired(session));

      // Delete each expired session
      for (const session of expiredSessions) {
        await this.database.deleteSession(session.id);
      }

      return expiredSessions.length;
    } catch (error) {
      console.error('[SessionService] Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  // ==========================================================================
  // Multi-Session Management
  // ==========================================================================

  /**
   * Gets all sessions for a specific user
   * 
   * Returns all active sessions for the given user ID, useful for displaying
   * logged-in devices or managing multi-device sessions.
   * 
   * @param userId - User ID to get sessions for
   * @returns Promise resolving to array of user's sessions
   * @throws {Error} If userId is not provided
   * 
   * @example
   * ```typescript
   * const sessions = await sessionService.getUserSessions('user-123');
   * console.log(`User has ${sessions.length} active sessions`);
   * sessions.forEach(session => {
   *   console.log(`Device: ${session.deviceInfo}`);
   * });
   * ```
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await this.database.getUserSessions(userId);
  }

  /**
   * Invalidates all sessions for a specific user
   * 
   * Force logout from all devices. Useful for security events like password
   * changes, account compromise, or user-initiated "logout everywhere" action.
   * 
   * @param userId - User ID to invalidate sessions for
   * @throws {Error} If userId is not provided
   * 
   * @example
   * ```typescript
   * // After password change, force logout from all devices
   * await sessionService.invalidateAllUserSessions('user-123');
   * console.log('User logged out from all devices');
   * ```
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await this.database.deleteAllUserSessions(userId);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Gets device information from the user agent
   * 
   * @returns Device info string (browser extension context)
   * @private
   */
  private getDeviceInfo(): string {
    // In browser extension context, navigator is available
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
    return 'Unknown Device';
  }

  /**
   * Gets the client IP address
   * 
   * @returns IP address string (always 'local' for browser extension)
   * @private
   */
  private getIpAddress(): string {
    // Browser extensions don't have access to real IP
    // This would be set by backend in a client-server architecture
    return 'local';
  }
}
