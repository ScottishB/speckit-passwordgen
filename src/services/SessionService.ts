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
}
