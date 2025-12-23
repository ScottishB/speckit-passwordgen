/**
 * AuthService - Authentication and User Management Service
 * 
 * Handles user registration, login, logout, and account management.
 * Integrates with CryptoService for password hashing/verification,
 * SessionService for session management, SecurityLogService for audit logging,
 * and Database for user storage.
 */

import type { User, CreateUserInput } from '../models/User';
import type { Session } from '../models/Session';
import { CryptoService } from './CryptoService';
import { SessionService } from './SessionService';
import { SecurityLogService } from './SecurityLogService';
import { TotpService } from './TotpService';
import { Database } from './database';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Custom error class for session expiration
 */
export class SessionExpiredError extends Error {
  constructor(message: string = 'Session has expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/**
 * AuthService class for authentication and user management
 */
export class AuthService {
  private crypto: CryptoService;
  private sessionService: SessionService;
  private securityLog: SecurityLogService;
  private totpService: TotpService;
  private database: Database;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  // Account lockout configuration
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_2FA_ATTEMPTS = 3;

  /**
   * Creates an instance of AuthService
   * 
   * @param crypto - CryptoService instance for password hashing/verification
   * @param sessionService - SessionService instance for session management
   * @param securityLog - SecurityLogService instance for audit logging
   * @param totpService - TotpService instance for 2FA functionality
   * @param database - Database instance for user storage
   * @throws Error if any required dependency is missing
   */
  constructor(
    crypto: CryptoService,
    sessionService: SessionService,
    securityLog: SecurityLogService,
    totpService: TotpService,
    database: Database
  ) {
    if (!crypto) {
      throw new Error('CryptoService is required');
    }
    if (!sessionService) {
      throw new Error('SessionService is required');
    }
    if (!securityLog) {
      throw new Error('SecurityLogService is required');
    }
    if (!totpService) {
      throw new Error('TotpService is required');
    }
    if (!database) {
      throw new Error('Database is required');
    }

    this.crypto = crypto;
    this.sessionService = sessionService;
    this.securityLog = securityLog;
    this.totpService = totpService;
    this.database = database;
  }

  /**
   * Register a new user
   * 
   * Creates a new user account with username and password.
   * Validates username availability and password strength.
   * Hashes password using Argon2id and generates a salt for key derivation.
   * 
   * @param username - The username for the new account
   * @param password - The password for the new account
   * @returns Promise resolving to the created User (without password hash)
   * @throws ValidationError if username is taken or password is weak
   * @throws Error if registration fails
   * 
   * @example
   * ```typescript
   * const user = await authService.register('john_doe', 'SecureP@ssw0rd123');
   * console.log('User created:', user.username);
   * ```
   */
  async register(username: string, password: string): Promise<User> {
    // Validate inputs
    if (!username || username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }

    if (!password || password.length === 0) {
      throw new ValidationError('Password is required');
    }

    // Normalize username
    const normalizedUsername = username.trim().toLowerCase();

    // Check username availability
    const available = await this.isUsernameAvailable(normalizedUsername);
    if (!available) {
      throw new ValidationError('Username is already taken');
    }

    // Validate password strength
    const strengthResult = this.validatePasswordStrength(password);
    if (!strengthResult.valid) {
      throw new ValidationError(`Password is too weak: ${strengthResult.errors.join(', ')}`);
    }

    try {
      // Hash password with Argon2id
      const passwordHash = await this.crypto.hashPassword(password);

      // Generate salt for key derivation
      const saltBytes = this.crypto.generateSalt();
      const salt = btoa(String.fromCharCode(...saltBytes));

      // Create user object
      const user: User = {
        id: crypto.randomUUID(),
        username: normalizedUsername,
        passwordHash,
        salt,
        totpSecret: null,
        backupCodes: [],
        backupCodesUsed: [],
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        accountLockedUntil: null,
        lastLogin: null,
        createdAt: Date.now(),
      };

      // Save user to database
      const savedUser = await this.database.saveUser(user);

      // Log registration event
      await this.securityLog.logEvent({
        userId: savedUser.id,
        eventType: 'registration',
        ipAddress: 'local',
        details: 'User account created',
      });

      // Return user without sensitive data
      const { passwordHash: _, ...userWithoutPassword } = savedUser;
      return userWithoutPassword as User;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Login a user
   * 
   * Authenticates a user with username and password.
   * Optionally validates TOTP code if 2FA is enabled.
   * Handles failed login attempts and account lockout.
   * Creates a new session on successful authentication.
   * 
   * @param username - The username
   * @param password - The password
   * @param totpCode - Optional TOTP code (required if 2FA is enabled)
   * @returns Promise resolving to the created Session
   * @throws AuthError if credentials are invalid, account is locked, or 2FA fails
   * @throws Error if login fails
   * 
   * @example
   * ```typescript
   * // Login without 2FA
   * const session = await authService.login('john_doe', 'SecureP@ssw0rd123');
   * 
   * // Login with 2FA
   * const session = await authService.login('john_doe', 'SecureP@ssw0rd123', '123456');
   * ```
   */
  async login(username: string, password: string, totpCode?: string): Promise<Session> {
    // Validate inputs
    if (!username || username.trim().length === 0) {
      throw new AuthError('Username is required');
    }

    if (!password || password.length === 0) {
      throw new AuthError('Password is required');
    }

    const normalizedUsername = username.trim().toLowerCase();

    try {
      console.log('[AuthService.login] Attempting login for username:', normalizedUsername);
      
      // Retrieve user by username
      const user = await this.database.getUserByUsername(normalizedUsername);
      if (!user) {
        console.log('[AuthService.login] User not found');
        // Log failed login attempt (username not found)
        await this.securityLog.logEvent({
          userId: 'unknown',
          eventType: 'login_failed',
          ipAddress: 'local',
          details: `Login failed: Username not found (${normalizedUsername})`,
        });
        throw new AuthError('Invalid username or password');
      }
      
      console.log('[AuthService.login] User found:', user.username);
      console.log('[AuthService.login] Password hash:', user.passwordHash.substring(0, 50) + '...');

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);
        await this.securityLog.logEvent({
          userId: user.id,
          eventType: 'login_failed',
          ipAddress: 'local',
          details: `Login attempt on locked account (${remainingMinutes} minutes remaining)`,
        });
        throw new AuthError(
          `Account is locked. Please try again in ${remainingMinutes} minute(s).`,
          'ACCOUNT_LOCKED'
        );
      }

      // Verify password
      const passwordValid = await this.crypto.verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updates: Partial<User> = {
          failedLoginAttempts: failedAttempts,
          lastFailedLogin: Date.now(),
        };

        // Lock account if max attempts reached
        if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          updates.accountLockedUntil = Date.now() + this.LOCKOUT_DURATION;
        }

        await this.database.updateUser(user.id, updates);

        // Log failed login attempt
        await this.securityLog.logEvent({
          userId: user.id,
          eventType: 'login_failed',
          ipAddress: 'local',
          details: `Invalid password (attempt ${failedAttempts}/${this.MAX_LOGIN_ATTEMPTS})`,
        });

        if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          throw new AuthError(
            'Account locked due to too many failed login attempts. Please try again in 15 minutes.',
            'ACCOUNT_LOCKED'
          );
        }

        throw new AuthError('Invalid username or password');
      }

      // Check if 2FA is enabled
      if (user.totpSecret) {
        if (!totpCode) {
          throw new AuthError('Two-factor authentication code is required', '2FA_REQUIRED');
        }

        // Validate TOTP code
        const totpValid = await this.validate2FACode(user, totpCode);
        if (!totpValid) {
          // Increment failed 2FA attempts (stored in failedLoginAttempts)
          const failedAttempts = (user.failedLoginAttempts || 0) + 1;
          const updates: Partial<User> = {
            failedLoginAttempts: failedAttempts,
            lastFailedLogin: Date.now(),
          };

          // Lock account if max 2FA attempts reached
          if (failedAttempts >= this.MAX_2FA_ATTEMPTS) {
            updates.accountLockedUntil = Date.now() + this.LOCKOUT_DURATION;
          }

          await this.database.updateUser(user.id, updates);

          // Log failed 2FA attempt
          await this.securityLog.logEvent({
            userId: user.id,
            eventType: '2fa_failed',
            ipAddress: 'local',
            details: `Invalid 2FA code (attempt ${failedAttempts}/${this.MAX_2FA_ATTEMPTS})`,
          });

          if (failedAttempts >= this.MAX_2FA_ATTEMPTS) {
            throw new AuthError(
              'Account locked due to too many failed 2FA attempts. Please try again in 15 minutes.',
              'ACCOUNT_LOCKED'
            );
          }

          throw new AuthError('Invalid two-factor authentication code', '2FA_INVALID');
        }
      }

      // Reset failed login attempts on successful authentication
      await this.database.updateUser(user.id, {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        accountLockedUntil: null,
        lastLogin: Date.now(),
      });

      // Create session
      const session = await this.sessionService.createSession(user.id);

      // Set current user and session
      this.currentUser = user;
      this.currentSession = session;

      // Store session ID in localStorage for persistence across page refreshes
      localStorage.setItem('pwgen_current_session', session.id);

      // Log successful login
      await this.securityLog.logEvent({
        userId: user.id,
        eventType: 'login_success',
        ipAddress: 'local',
        details: user.totpSecret ? 'Login successful with 2FA' : 'Login successful',
      });

      return session;
    } catch (error) {
      if (error instanceof AuthError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate 2FA code (TOTP or backup code)
   * 
   * @param user - The user to validate for
   * @param code - The 2FA code to validate
   * @returns Promise resolving to true if valid, false otherwise
   */
  private async validate2FACode(user: User, code: string): Promise<boolean> {
    // First try TOTP validation if secret exists
    if (user.totpSecret) {
      const isValidTotp = this.totpService.validateToken(code, user.totpSecret);
      if (isValidTotp) {
        return true;
      }
    }

    // If TOTP failed or not available, try backup codes
    if (user.backupCodes && user.backupCodes.length > 0) {
      for (let i = 0; i < user.backupCodes.length; i++) {
        const hashedBackupCode = user.backupCodes[i];
        if (!hashedBackupCode) continue;

        // Check if this backup code has already been used
        if (user.backupCodesUsed?.includes(i)) {
          continue;
        }

        // Validate backup code
        const isValidBackupCode = await this.totpService.validateBackupCode(code, hashedBackupCode);
        if (isValidBackupCode) {
          // Mark backup code as used
          const backupCodesUsed = user.backupCodesUsed || [];
          backupCodesUsed.push(i);
          await this.database.updateUser(user.id, { backupCodesUsed });
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Logout a user
   * 
   * Invalidates the specified session and clears current user/session state.
   * 
   * @param sessionId - The session ID to invalidate
   * @returns Promise resolving when logout is complete
   * @throws Error if logout fails
   * 
   * @example
   * ```typescript
   * await authService.logout('session-id-123');
   * ```
   */
  async logout(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    try {
      // Get session to retrieve user ID for logging
      const session = await this.sessionService.getSession(sessionId);

      // Invalidate session
      await this.sessionService.invalidateSession(sessionId);

      // Log logout event
      if (session) {
        await this.securityLog.logEvent({
          userId: session.userId,
          eventType: 'logout',
          ipAddress: 'local',
          details: 'User logged out',
        });
      }

      // Clear current user and session if they match
      if (this.currentSession?.id === sessionId) {
        this.currentUser = null;
        this.currentSession = null;
        
        // Remove stored session ID from localStorage
        localStorage.removeItem('pwgen_current_session');
      }
    } catch (error) {
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current authenticated user
   * 
   * @returns The current user or null if not authenticated
   * 
   * @example
   * ```typescript
   * const user = authService.getCurrentUser();
   * if (user) {
   *   console.log('Logged in as:', user.username);
   * }
   * ```
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get the current session
   * 
   * @returns The current session or null if not authenticated
   * 
   * @example
   * ```typescript
   * const session = authService.getCurrentSession();
   * if (session) {
   *   console.log('Session ID:', session.id);
   * }
   * ```
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Restore session from localStorage
   * Attempts to restore the user's session on app initialization
   * 
   * @returns Promise that resolves to true if session restored successfully, false otherwise
   * 
   * @example
   * ```typescript
   * await authService.restoreSession();
   * if (authService.isAuthenticated()) {
   *   // Session restored, show main app
   * }
   * ```
   */
  async restoreSession(): Promise<boolean> {
    try {
      // Check if there's a stored session ID
      const storedSessionId = localStorage.getItem('pwgen_current_session');
      if (!storedSessionId) {
        console.log('[AuthService.restoreSession] No stored session found');
        return false;
      }

      console.log('[AuthService.restoreSession] Found stored session ID, attempting to restore...');

      // Retrieve session from database
      const session = await this.sessionService.getSession(storedSessionId);
      if (!session) {
        console.log('[AuthService.restoreSession] Session not found in database');
        localStorage.removeItem('pwgen_current_session');
        return false;
      }

      // Check if session is expired
      if (this.sessionService.isSessionExpired(session)) {
        console.log('[AuthService.restoreSession] Session expired');
        localStorage.removeItem('pwgen_current_session');
        await this.sessionService.invalidateSession(storedSessionId);
        return false;
      }

      // Retrieve user from database
      const user = await this.database.getUser(session.userId);
      if (!user) {
        console.log('[AuthService.restoreSession] User not found');
        localStorage.removeItem('pwgen_current_session');
        await this.sessionService.invalidateSession(storedSessionId);
        return false;
      }

      // Restore user and session
      this.currentUser = user;
      this.currentSession = session;

      // Update session activity
      await this.sessionService.updateActivity(session.id);

      console.log('[AuthService.restoreSession] Session restored successfully for user:', user.username);
      return true;
    } catch (error) {
      console.error('[AuthService.restoreSession] Error restoring session:', error);
      localStorage.removeItem('pwgen_current_session');
      return false;
    }
  }

  /**
   * Check if user is authenticated
   * 
   * @returns True if user is authenticated with a valid session, false otherwise
   * 
   * @example
   * ```typescript
   * if (authService.isAuthenticated()) {
   *   // Show authenticated UI
   * } else {
   *   // Show login form
   * }
   * ```
   */
  isAuthenticated(): boolean {
    if (!this.currentUser || !this.currentSession) {
      return false;
    }

    // Check if session is expired
    if (this.sessionService.isSessionExpired(this.currentSession)) {
      this.currentUser = null;
      this.currentSession = null;
      localStorage.removeItem('pwgen_current_session');
      return false;
    }

    return true;
  }

  /**
   * Validate password strength
   * 
   * Validates password against OWASP/NIST requirements:
   * - Minimum 12 characters
   * - Contains uppercase letter
   * - Contains lowercase letter
   * - Contains number
   * - Contains special character
   * 
   * @param password - The password to validate
   * @returns Validation result with errors if invalid
   * 
   * @example
   * ```typescript
   * const result = authService.validatePasswordStrength('weak');
   * if (!result.valid) {
   *   console.error('Password errors:', result.errors);
   * }
   * ```
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];

    if (!password) {
      return { valid: false, errors: ['Password is required'] };
    }

    // Minimum length (OWASP/NIST recommends 12+ characters)
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if username is available
   * 
   * @param username - The username to check
   * @returns Promise resolving to true if available, false if taken
   * 
   * @example
   * ```typescript
   * const available = await authService.isUsernameAvailable('john_doe');
   * if (!available) {
   *   console.error('Username is already taken');
   * }
   * ```
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!username || username.trim().length === 0) {
      return false;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const existingUser = await this.database.getUserByUsername(normalizedUsername);
    return existingUser === null;
  }

  /**
   * Delete user account
   * 
   * Permanently deletes a user account after password verification.
   * Deletes user data, encrypted vault, all sessions, and security events.
   * Logs deletion event before clearing events.
   * 
   * @param userId - The user ID to delete
   * @param password - The password for verification
   * @returns Promise resolving when deletion is complete
   * @throws AuthError if password is invalid
   * @throws Error if deletion fails
   * 
   * @example
   * ```typescript
   * await authService.deleteAccount('user-id-123', 'password');
   * ```
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!password) {
      throw new AuthError('Password is required for account deletion');
    }

    try {
      // Retrieve user
      const user = await this.database.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const passwordValid = await this.crypto.verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        await this.securityLog.logEvent({
          userId: user.id,
          eventType: 'login_failed',
          ipAddress: 'local',
          details: 'Account deletion failed: Invalid password',
        });
        throw new AuthError('Invalid password');
      }

      // Log deletion event (before clearing events)
      await this.securityLog.logEvent({
        userId: user.id,
        eventType: 'account_deleted',
        ipAddress: 'local',
        details: 'User account deleted',
      });

      // Delete user's encrypted vault
      await this.database.deleteVault(userId);

      // Invalidate all user sessions
      await this.database.deleteAllUserSessions(userId);

      // Clear security events
      await this.securityLog.clearUserEvents(userId);

      // Delete user from database
      await this.database.deleteUser(userId);

      // Clear current user and session if they match
      if (this.currentUser?.id === userId) {
        this.currentUser = null;
        this.currentSession = null;
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new Error(`Account deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable two-factor authentication for a user
   * 
   * Generates a TOTP secret, QR code, and backup codes.
   * Updates the user record with the secret and hashed backup codes.
   * Returns the plaintext backup codes for the user to save.
   * 
   * @param userId - The user ID to enable 2FA for
   * @returns Promise resolving to secret, QR code data URL, and backup codes
   * @throws Error if user not found or 2FA setup fails
   * 
   * @example
   * ```typescript
   * const { secret, qrCode, backupCodes } = await authService.enable2FA(userId);
   * console.log('Scan this QR code:', qrCode);
   * console.log('Backup codes:', backupCodes);
   * ```
   */
  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      console.log('[AuthService.enable2FA] Starting 2FA setup for userId:', userId);
      
      // Retrieve user
      const user = await this.database.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }
      console.log('[AuthService.enable2FA] User found:', user.username);

      // Generate TOTP secret
      const secret = this.totpService.generateSecret();
      console.log('[AuthService.enable2FA] Secret generated, length:', secret?.length);

      // Generate QR code
      const qrCode = await this.totpService.generateQRCode(secret, user.username);
      console.log('[AuthService.enable2FA] QR code generated, length:', qrCode?.length);
      console.log('[AuthService.enable2FA] QR code starts with:', qrCode?.substring(0, 30));

      // Generate backup codes
      const backupCodes = this.totpService.generateBackupCodes();
      console.log('[AuthService.enable2FA] Backup codes generated:', backupCodes.length);

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.totpService.hashBackupCode(code))
      );

      // Update user with TOTP secret and hashed backup codes
      await this.database.updateUser(userId, {
        totpSecret: secret,
        backupCodes: hashedBackupCodes,
        backupCodesUsed: [],
      });
      console.log('[AuthService.enable2FA] User updated with 2FA settings');

      // Refresh currentUser if this is the logged-in user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = await this.database.getUser(userId);
      }

      // Log 2FA enabled event
      await this.securityLog.logEvent({
        userId,
        eventType: '2fa_enabled',
        ipAddress: 'local',
        details: 'Two-factor authentication enabled',
      });

      // Return secret, QR code, and plaintext backup codes
      return {
        secret,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error('[AuthService.enable2FA] Error:', error);
      throw new Error(`2FA setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**   * Clears 2FA setup data when user skips setup during registration
   * 
   * Used when user declines to set up 2FA during initial registration.
   * Does not require password confirmation since it's part of registration flow.
   * 
   * @param userId - The user ID to clear 2FA setup for
   * @returns Promise resolving when 2FA setup is cleared
   * @throws Error if user not found or clear fails
   * 
   * @example
   * ```typescript
   * await authService.clear2FASetup(userId);
   * ```
   */
  async clear2FASetup(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Retrieve user
      const user = await this.database.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Clear TOTP secret and backup codes
      await this.database.updateUser(userId, {
        totpSecret: null,
        backupCodes: [],
        backupCodesUsed: [],
      });

      // Refresh currentUser if this is the logged-in user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = await this.database.getUser(userId);
      }

      console.log('[AuthService.clear2FASetup] 2FA setup cleared for user:', userId);
    } catch (error) {
      throw new Error(`Clear 2FA setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**   * Disable two-factor authentication for a user
   * 
   * Requires password confirmation for security.
   * Clears TOTP secret and backup codes.
   * 
   * @param userId - The user ID to disable 2FA for
   * @param password - Password for confirmation
   * @returns Promise resolving when 2FA is disabled
   * @throws AuthError if password is invalid
   * @throws Error if user not found or disable fails
   * 
   * @example
   * ```typescript
   * await authService.disable2FA(userId, 'password123');
   * ```
   */
  async disable2FA(userId: string, password: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!password) {
      throw new AuthError('Password is required to disable 2FA');
    }

    try {
      // Retrieve user
      const user = await this.database.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const passwordValid = await this.crypto.verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        throw new AuthError('Invalid password');
      }

      // Clear TOTP secret and backup codes
      await this.database.updateUser(userId, {
        totpSecret: null,
        backupCodes: [],
        backupCodesUsed: [],
      });

      // Refresh currentUser if this is the logged-in user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = await this.database.getUser(userId);
      }

      // Log 2FA disabled event
      await this.securityLog.logEvent({
        userId,
        eventType: '2fa_disabled',
        ipAddress: 'local',
        details: 'Two-factor authentication disabled',
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new Error(`Disable 2FA failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Regenerate backup codes for a user
   * 
   * Generates new backup codes and replaces the old ones.
   * Returns the plaintext backup codes for the user to save.
   * 
   * @param userId - The user ID to regenerate backup codes for
   * @returns Promise resolving to new backup codes
   * @throws Error if user not found or regeneration fails
   * 
   * @example
   * ```typescript
   * const backupCodes = await authService.regenerateBackupCodes(userId);
   * console.log('New backup codes:', backupCodes);
   * ```
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Retrieve user
      const user = await this.database.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if 2FA is enabled
      if (!user.totpSecret) {
        throw new Error('Two-factor authentication is not enabled');
      }

      // Generate new backup codes
      const backupCodes = this.totpService.generateBackupCodes();

      // Hash backup codes for storage
      const hashedBackupCodes = await Promise.all(
        backupCodes.map(code => this.totpService.hashBackupCode(code))
      );

      // Update user with new backup codes
      await this.database.updateUser(userId, {
        backupCodes: hashedBackupCodes,
        backupCodesUsed: [],
      });

      // Refresh currentUser if this is the logged-in user
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = await this.database.getUser(userId);
      }

      // Log backup code regeneration event
      await this.securityLog.logEvent({
        userId,
        eventType: '2fa_enabled', // Reuse 2fa_enabled for backup code updates
        ipAddress: 'local',
        details: 'Backup codes regenerated',
      });

      return backupCodes;
    } catch (error) {
      throw new Error(`Backup code regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
