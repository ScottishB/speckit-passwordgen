/**
 * User Model
 * 
 * Represents a user account in the multi-user password management system.
 * Implements OWASP ASVS 4.0 authentication requirements.
 */

/**
 * User account interface
 * 
 * @property id - Unique user identifier (UUID v4)
 * @property username - Username (3-50 chars, alphanumeric + underscore)
 * @property passwordHash - Argon2id hash of master password
 * @property salt - Salt used for key derivation (base64-encoded)
 * @property totpSecret - Base32-encoded TOTP secret for 2FA (null if disabled)
 * @property backupCodes - Array of hashed backup codes for 2FA recovery
 * @property backupCodesUsed - Array of indices of backup codes that have been used
 * @property createdAt - Account creation timestamp (milliseconds since epoch)
 * @property lastLogin - Last successful login timestamp (null if never logged in)
 * @property failedLoginAttempts - Counter for rate limiting
 * @property lastFailedLogin - Last failed login attempt timestamp (null if none)
 * @property accountLockedUntil - Account lockout expiration timestamp (null if not locked)
 */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  totpSecret: string | null;
  backupCodes: string[];
  backupCodesUsed: number[];
  createdAt: number;
  lastLogin: number | null;
  failedLoginAttempts: number;
  lastFailedLogin: number | null;
  accountLockedUntil: number | null;
}

/**
 * Type for creating a new user (omits auto-generated fields)
 */
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'failedLoginAttempts' | 'lastFailedLogin' | 'accountLockedUntil'> & {
  id?: string;
  createdAt?: number;
  lastLogin?: number | null;
  failedLoginAttempts?: number;
  lastFailedLogin?: number | null;
  accountLockedUntil?: number | null;
};
