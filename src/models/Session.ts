/**
 * Session Model
 * 
 * Represents an authenticated user session.
 * Implements OWASP ASVS 4.0 session management requirements.
 */

/**
 * User session interface
 * 
 * @property id - Unique session identifier (UUID v4)
 * @property userId - Foreign key to User.id
 * @property sessionToken - Cryptographically random session token
 * @property createdAt - Session creation timestamp (for absolute timeout)
 * @property lastActivity - Last activity timestamp (for idle timeout)
 * @property expiresAt - Session expiration timestamp (computed from timeouts)
 * @property deviceInfo - User agent string for session tracking
 * @property ipAddress - Client IP address (or "local" for browser extension)
 */
export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  deviceInfo: string;
  ipAddress: string;
}

/**
 * Type for creating a new session (omits auto-generated fields)
 */
export type CreateSessionInput = Omit<Session, 'id' | 'createdAt' | 'lastActivity' | 'expiresAt'> & {
  id?: string;
  createdAt?: number;
  lastActivity?: number;
  expiresAt?: number;
};
