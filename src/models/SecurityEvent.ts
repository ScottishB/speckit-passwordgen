/**
 * SecurityEvent Model
 * 
 * Represents a security-related event for audit logging.
 * Implements OWASP ASVS 4.0 logging requirements.
 */

/**
 * Security event types
 */
export type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'registration'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_failed'
  | 'session_expired'
  | 'account_deleted'
  | 'password_changed';

/**
 * Security event interface
 * 
 * @property id - Unique event identifier (UUID v4)
 * @property userId - Foreign key to User.id
 * @property eventType - Type of security event
 * @property timestamp - Event timestamp
 * @property ipAddress - Client IP address
 * @property details - Additional context about the event
 */
export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: SecurityEventType;
  timestamp: number;
  ipAddress: string;
  details: string;
}

/**
 * Type for creating a new security event (omits auto-generated fields)
 */
export type CreateSecurityEventInput = Omit<SecurityEvent, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: number;
};
