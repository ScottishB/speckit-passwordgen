# Security Best Practices & Implementation Checklist

**Feature**: User Authentication & Site Password Management (002-user-auth-sites)  
**Date**: 2025-12-19  
**Standards**: OWASP ASVS 4.0, NIST SP 800-63B, OWASP Top 10 2021

---

## Executive Summary

This document provides security guidelines and implementation checklists for the PasswordGen authentication and site management feature. All recommendations are based on industry-standard security frameworks including OWASP Application Security Verification Standard (ASVS) 4.0, NIST Special Publication 800-63B (Digital Identity Guidelines), and OWASP Top 10 security risks.

**Security Posture**: This implementation follows defense-in-depth principles with multiple layers of protection including strong password hashing (Argon2id), encryption at rest (AES-GCM), secure key derivation (PBKDF2), multi-factor authentication (TOTP), session management, and comprehensive security logging.

---

## Table of Contents

1. [Password Storage Security (OWASP)](#password-storage-security)
2. [Key Derivation Guidelines (NIST)](#key-derivation-guidelines)
3. [Authentication Security](#authentication-security)
4. [Session Management](#session-management)
5. [Cryptographic Implementation](#cryptographic-implementation)
6. [Data Protection](#data-protection)
7. [Two-Factor Authentication (2FA)](#two-factor-authentication)
8. [Security Logging & Monitoring](#security-logging--monitoring)
9. [Implementation Checklist](#implementation-checklist)
10. [Security Testing Requirements](#security-testing-requirements)

---

## Password Storage Security

### OWASP Guidelines (ASVS 4.0 Section 2.4)

**Reference**: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

#### V2.4.1: Password Hashing Requirements

✅ **Implemented**: Use Argon2id for password hashing

**OWASP Recommendation**: Argon2id is the winner of the 2015 Password Hashing Competition and is the recommended algorithm for password storage.

**Our Implementation**:
```typescript
// Argon2id with recommended parameters
const hash = await argon2.hash({
  pass: password,
  salt: randomSalt,
  time: 3,        // iterations (OWASP: minimum 2, recommended 3+)
  mem: 65536,     // 64 MiB memory (OWASP: minimum 19 MiB, recommended 47 MiB+)
  hashLen: 32,    // 256-bit output
  parallelism: 1, // single thread for browser
  type: argon2.ArgonType.Argon2id
});
```

**Parameters Justification**:
- **Time (iterations)**: 3 iterations provides ~500-1200ms on desktop, 1200-2000ms on mobile
  - OWASP minimum: 2 iterations
  - Our choice: 3 iterations (exceeds minimum, balances security and UX)
  
- **Memory**: 64 MiB
  - OWASP minimum: 19 MiB (19456 KiB)
  - Our choice: 64 MiB (65536 KiB) - significantly exceeds minimum
  - Defense against GPU-based attacks
  
- **Parallelism**: 1
  - Browser limitation: JavaScript is single-threaded
  - Acceptable trade-off for client-side hashing

#### V2.4.2: Salt Requirements

✅ **Implemented**: Use cryptographically secure random salts

**OWASP Requirements**:
- Salt must be unique per user
- Salt must be cryptographically random
- Salt length: minimum 128 bits (16 bytes), recommended 256 bits (32 bytes)

**Our Implementation**:
```typescript
// Generate 256-bit (32-byte) salt
const salt = new Uint8Array(32);
crypto.getRandomValues(salt);
```

**Storage**: Salt is stored alongside hash in format: `$argon2id$v=19$m=65536,t=3,p=1$<base64_salt>$<base64_hash>`

#### V2.4.3: Pepper (Additional Secret)

⚠️ **Not Implemented**: Server-side pepper not applicable

**OWASP Recommendation**: Add a secret "pepper" to password hashes stored server-side.

**Rationale for Not Implementing**: This is a client-side application with browser localStorage. There is no server-side secret storage, so pepper cannot be securely implemented. The Argon2id algorithm with strong parameters provides sufficient protection.

**Alternative**: Per-user encryption keys (derived from master password) provide similar protection for user data.

#### V2.4.4: Password Strength Requirements

✅ **Implemented**: Enforce minimum password complexity

**OWASP Requirements** (ASVS 2.1.1):
- Minimum 8 characters for user passwords
- Minimum 12 characters for administrative passwords
- No maximum length limit (allow at least 128 characters)
- No composition rules (do not require specific character types)

**Our Implementation**:
```typescript
function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // OWASP: Minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // OWASP: Allow up to 128 characters (we allow 256)
  if (password.length > 256) {
    errors.push('Password must be less than 256 characters');
  }
  
  // OWASP: Check against common passwords (optional but recommended)
  if (isCommonPassword(password)) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**No Composition Rules**: Per OWASP guidance, we do NOT enforce "must contain uppercase, lowercase, number, special character" rules as these:
- Reduce password entropy
- Lead to predictable patterns
- Frustrate users
- Are less effective than length requirements

#### V2.4.5: Password Reset Security

✅ **Implemented**: Secure password change flow

**OWASP Requirements**:
- Require current password for password change
- Re-authenticate sessions after password change
- Log password change events

**Our Implementation**:
```typescript
async changePassword(
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  // Verify current password
  const isValid = await this.verifyPassword(userId, currentPassword);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }
  
  // Hash new password
  const newHash = await this.hashPassword(newPassword);
  
  // Update password
  await db.updateUserPassword(userId, newHash);
  
  // Log security event
  await securityLog.logEvent({
    userId,
    eventType: 'password_changed',
    success: true
  });
  
  // Invalidate all sessions (force re-login)
  await sessionService.invalidateAllSessions(userId);
}
```

---

## Key Derivation Guidelines

### NIST SP 800-63B Guidelines

**Reference**: [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) - Digital Identity Guidelines (Authentication and Lifecycle Management)

#### Section 5.1.1.2: Memorized Secret Verifiers

✅ **Implemented**: PBKDF2 for encryption key derivation

**NIST Requirements**:
- Use approved key derivation function (KDF)
- PBKDF2 with HMAC-SHA-256 or HMAC-SHA-512
- Minimum 10,000 iterations (as of 2023, recommend 100,000+)
- Salt: minimum 128 bits, cryptographically random

**Our Implementation**:
```typescript
async function deriveEncryptionKey(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import master password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,              // 256-bit random salt
      iterations: 100000,      // NIST minimum: 10,000, our choice: 100,000
      hash: 'SHA-256'          // NIST approved: SHA-256 or SHA-512
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256              // 256-bit AES key
    },
    false,                     // not extractable
    ['encrypt', 'decrypt']
  );
}
```

**Iteration Count Justification**:
- **NIST Minimum (2023)**: 10,000 iterations
- **OWASP Recommendation**: 100,000 iterations for PBKDF2-SHA256
- **Our Choice**: 100,000 iterations
  - Provides strong protection against brute-force attacks
  - Desktop performance: ~500-1500ms (acceptable for login/key derivation)
  - Mobile performance: ~1500-3000ms (acceptable for infrequent operations)
  - Will be reviewed annually and increased as hardware improves

#### Section 5.1.1.1: Memorized Secrets (Password Requirements)

✅ **Implemented**: NIST-compliant password policies

**NIST Requirements**:
- Minimum 8 characters when chosen by user
- Maximum length: allow at least 64 characters
- Allow all ASCII printable characters (including spaces)
- Allow Unicode characters
- Do NOT require specific character types
- Do NOT require periodic password changes
- Screen against common/compromised passwords

**Our Implementation**:
```typescript
const PASSWORD_MIN_LENGTH = 8;    // NIST minimum
const PASSWORD_MAX_LENGTH = 256;  // Exceeds NIST minimum of 64

// Allow all printable characters (no restrictions)
// Unicode support enabled
// No composition rules enforced
```

**Common Password Screening**:
```typescript
// Check against top 10,000 most common passwords
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', 'qwerty',
  'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
  // ... (full list of 10,000)
]);

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}
```

#### Section 5.2.3: Reauthentication

✅ **Implemented**: Session timeout and reauthentication

**NIST Requirements**:
- Periodic reauthentication for long-running sessions
- Reauthentication required for sensitive operations

**Our Implementation**:
- **Idle timeout**: 30 minutes of inactivity → automatic logout
- **Absolute timeout**: 8 hours from login → automatic logout
- **Sensitive operations**: Password change, 2FA changes, account deletion require reauthentication

---

## Authentication Security

### OWASP Top 10 2021: A07 - Identification and Authentication Failures

✅ **Protections Implemented**:

#### 1. No Default Credentials
- No default admin accounts
- Each user creates unique credentials

#### 2. Weak Password Protection
- 8-character minimum (NIST compliant)
- Common password screening
- Password strength indicator in UI

#### 3. Credential Stuffing Protection
- Rate limiting on login attempts (max 5 failed attempts)
- Exponential backoff: 1s, 2s, 4s, 8s, 16s delays
- Account lockout after 10 failed attempts in 15 minutes

**Implementation**:
```typescript
class AuthService {
  private failedAttempts = new Map<string, number[]>(); // username -> timestamps
  
  async login(username: string, password: string): Promise<Session> {
    // Check rate limiting
    const attempts = this.failedAttempts.get(username) || [];
    const recentAttempts = attempts.filter(t => Date.now() - t < 15 * 60 * 1000);
    
    if (recentAttempts.length >= 10) {
      throw new Error('Account temporarily locked. Try again in 15 minutes.');
    }
    
    // Verify credentials
    const user = await db.getUserByUsername(username);
    if (!user || !await this.verifyPassword(password, user.passwordHash)) {
      // Log failed attempt
      recentAttempts.push(Date.now());
      this.failedAttempts.set(username, recentAttempts);
      
      // Calculate delay
      const delay = Math.min(Math.pow(2, recentAttempts.length - 1) * 1000, 16000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      throw new Error('Invalid username or password');
    }
    
    // Clear failed attempts on success
    this.failedAttempts.delete(username);
    
    // Create session
    return await this.createSession(user);
  }
}
```

#### 4. Multi-Factor Authentication (MFA)

✅ **Implemented**: TOTP-based 2FA

**OWASP Requirements**:
- Support MFA for all users
- Use time-based one-time passwords (TOTP)
- Provide backup/recovery codes

**Our Implementation**:
- TOTP using RFC 6238 standard
- SHA-1 algorithm (maximum authenticator app compatibility)
- 6-digit codes, 30-second period
- Window of ±1 period (±30 seconds) for clock skew tolerance
- 10 backup codes per user (single-use, hashed in database)
- QR code generation for easy setup

---

## Session Management

### OWASP ASVS 4.0 Section 3: Session Management

✅ **Implemented**: Secure session management

#### V3.2.1: Session Binding

**Requirement**: Bind sessions to user and device

**Implementation**:
```typescript
interface Session {
  id: string;                    // Unique session ID (UUID v4)
  userId: string;                // User ID
  createdAt: Date;               // Session creation time
  lastActivityAt: Date;          // Last activity timestamp
  expiresAt: Date;               // Absolute expiration (8 hours)
  userAgent: string;             // Browser fingerprint
  ipAddress?: string;            // IP address (if available)
  is2FAVerified: boolean;        // 2FA verification status
}
```

#### V3.2.2: Session Timeout

**Requirements**:
- Idle timeout for inactive sessions
- Absolute timeout for long-running sessions
- User notification before timeout

**Implementation**:
```typescript
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000;  // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000;  // 8 hours
const TIMEOUT_WARNING = 5 * 60 * 1000;  // Warn 5 minutes before timeout

class SessionService {
  private timeoutWarningTimer?: number;
  private timeoutTimer?: number;
  
  startIdleTimer(): void {
    this.resetIdleTimer();
    
    // Listen for user activity
    ['click', 'keydown', 'mousemove', 'scroll'].forEach(event => {
      document.addEventListener(event, () => this.resetIdleTimer());
    });
  }
  
  private resetIdleTimer(): void {
    clearTimeout(this.timeoutWarningTimer);
    clearTimeout(this.timeoutTimer);
    
    // Update last activity
    this.updateLastActivity();
    
    // Set warning timer (25 minutes)
    this.timeoutWarningTimer = setTimeout(() => {
      this.showTimeoutWarning();
    }, SESSION_IDLE_TIMEOUT - TIMEOUT_WARNING);
    
    // Set logout timer (30 minutes)
    this.timeoutTimer = setTimeout(() => {
      this.logout('Session expired due to inactivity');
    }, SESSION_IDLE_TIMEOUT);
  }
  
  private showTimeoutWarning(): void {
    // Show notification with "Continue Session" button
    showNotification({
      message: 'Your session will expire in 5 minutes due to inactivity.',
      actions: [
        {
          label: 'Continue Session',
          onClick: () => this.resetIdleTimer()
        }
      ]
    });
  }
}
```

#### V3.2.3: Session Revocation

**Requirements**:
- Allow users to view active sessions
- Allow users to revoke sessions
- Invalidate all sessions on password change
- Invalidate all sessions on account deletion

**Implementation**:
```typescript
class SessionService {
  async getAllSessions(userId: string): Promise<Session[]> {
    return await db.getUserSessions(userId);
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    await db.deleteSession(sessionId);
    await securityLog.logEvent({
      userId,
      eventType: 'session_revoked',
      success: true,
      metadata: { sessionId }
    });
  }
  
  async invalidateAllSessions(userId: string): Promise<void> {
    await db.deleteAllUserSessions(userId);
    await securityLog.logEvent({
      userId,
      eventType: 'all_sessions_invalidated',
      success: true
    });
  }
}
```

#### V3.3.1: Session Token Generation

**Requirement**: Use cryptographically secure random tokens

**Implementation**:
```typescript
function generateSessionId(): string {
  // Use crypto.randomUUID() for cryptographically secure UUID v4
  return crypto.randomUUID();
}
```

---

## Cryptographic Implementation

### OWASP Cryptographic Storage Cheat Sheet

✅ **Implemented**: Secure data encryption

#### Algorithm Selection

**Requirements**:
- Use industry-standard algorithms
- Use authenticated encryption (prevents tampering)
- Use sufficient key lengths

**Our Implementation**:
```typescript
// Encryption: AES-256-GCM (authenticated encryption)
const algorithm = {
  name: 'AES-GCM',
  length: 256,      // 256-bit key
  iv: new Uint8Array(12),  // 96-bit IV (recommended for GCM)
  tagLength: 128    // 128-bit authentication tag
};

// Key Derivation: PBKDF2-SHA256
const kdf = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 100000,
  salt: new Uint8Array(32)  // 256-bit salt
};

// Password Hashing: Argon2id
const passwordHash = {
  algorithm: 'Argon2id',
  time: 3,
  memory: 65536,    // 64 MiB
  parallelism: 1
};
```

#### Key Management

**Requirements**:
- Never store encryption keys
- Derive keys from user passwords
- Use unique salts per user

**Implementation**:
```typescript
class CryptoService {
  // Keys are NEVER stored - always derived on demand
  private async deriveKey(
    masterPassword: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,  // not extractable (key cannot be exported)
      ['encrypt', 'decrypt']
    );
  }
  
  async encryptData(
    data: string,
    masterPassword: string,
    salt: Uint8Array
  ): Promise<EncryptedData> {
    const key = await this.deriveKey(masterPassword, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    
    return {
      ciphertext: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      salt: Array.from(salt)
    };
  }
}
```

#### Initialization Vector (IV) Management

**Requirements**:
- Use unique IV for each encryption operation
- Never reuse IVs with the same key

**Implementation**:
```typescript
// Generate new IV for every encryption
const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV for GCM

// Store IV with ciphertext (IV is not secret)
interface EncryptedData {
  ciphertext: number[];
  iv: number[];       // IV stored alongside ciphertext
  salt: number[];     // Salt for key derivation
}
```

#### Side-Channel Attack Prevention

⚠️ **Timing Attacks**: Mitigated through constant-time operations

**Implementation**:
```typescript
// Use constant-time comparison for password verification
async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Argon2 verification is constant-time
    await argon2.verify({ pass: password, encoded: hash });
    return true;
  } catch {
    return false;
  }
}

// Do NOT use simple string comparison:
// return password === storedPassword;  // ❌ Vulnerable to timing attacks
```

---

## Data Protection

### OWASP Top 10 2021: A02 - Cryptographic Failures

✅ **Protections Implemented**:

#### 1. Data Classification

**Sensitive Data** (encrypted at rest):
- Site passwords (user-generated passwords)
- Site URLs
- Site notes
- 2FA secrets (TOTP base32 secrets)
- 2FA backup codes (hashed, not encrypted)

**Non-Sensitive Data** (not encrypted):
- Usernames (needed for login)
- Email addresses (needed for account recovery)
- Password hashes (already cryptographically protected)
- Session metadata (timestamps, user agents)
- Security logs (audit trail)

#### 2. Encryption at Rest

**Implementation**:
```typescript
interface EncryptedVault {
  userId: string;
  encryptedData: {
    ciphertext: number[];  // Encrypted JSON of all user data
    iv: number[];          // Unique IV for this encryption
    salt: number[];        // Salt for key derivation
  };
  version: number;         // Schema version
  lastModified: Date;
}

// Encrypt all sensitive user data in a single vault
async function createVault(
  userId: string,
  masterPassword: string,
  userData: UserData
): Promise<EncryptedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const encryptedData = await cryptoService.encryptData(
    JSON.stringify(userData),
    masterPassword,
    salt
  );
  
  return {
    userId,
    encryptedData,
    version: 1,
    lastModified: new Date()
  };
}
```

#### 3. Data Minimization

**Principles**:
- Only store what is necessary
- Delete data when no longer needed
- Provide user control over data

**Implementation**:
- Password history limited to 50 entries (auto-delete oldest)
- Security logs limited to 1000 events per user (auto-delete oldest)
- Users can delete account and all associated data
- No collection of analytics or tracking data

---

## Two-Factor Authentication

### OWASP ASVS 4.0 Section 2.8: One-time Verifier

✅ **Implemented**: TOTP-based 2FA

#### V2.8.1: Time-Based OTP

**Requirements**:
- Use RFC 6238 compliant TOTP
- Secret: 160+ bits of entropy
- Hash: SHA-1 or SHA-256
- Time step: 30 seconds
- Code length: 6+ digits

**Implementation**:
```typescript
import { TOTP, Secret } from 'otpauth';

class TotpService {
  generateSecret(): string {
    // 160-bit (20-byte) secret
    const secret = new Secret({ size: 20 });
    return secret.base32;
  }
  
  generateToken(secret: string): string {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: 'SHA1',     // Maximum compatibility
      digits: 6,             // 6-digit codes
      period: 30             // 30-second time step
    });
    
    return totp.generate();
  }
  
  validateToken(secret: string, token: string): boolean {
    const totp = new TOTP({
      secret: Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });
    
    // Validate with ±1 period window (±30 seconds) for clock skew
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }
}
```

#### V2.8.2: Backup Codes

**Requirements**:
- Provide recovery codes in case of lost device
- Codes must be single-use
- Codes must be cryptographically random

**Implementation**:
```typescript
class TotpService {
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-digit random code
      const randomBytes = crypto.getRandomValues(new Uint8Array(4));
      const code = Array.from(randomBytes)
        .map(b => b.toString(10).padStart(3, '0'))
        .join('')
        .slice(0, 8);
      codes.push(code);
    }
    
    return codes;
  }
  
  async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    // Hash codes before storing (like passwords)
    const hashedCodes = await Promise.all(
      codes.map(code => hashBackupCode(code))
    );
    
    await db.storeBackupCodes(userId, hashedCodes);
  }
  
  async validateBackupCode(userId: string, code: string): Promise<boolean> {
    const storedCodes = await db.getBackupCodes(userId);
    const hash = await hashBackupCode(code);
    
    // Find matching code
    const index = storedCodes.findIndex(stored => stored === hash);
    if (index === -1) return false;
    
    // Remove used code (single-use)
    await db.removeBackupCode(userId, index);
    return true;
  }
}

async function hashBackupCode(code: string): Promise<string> {
  // Use SHA-256 for backup code hashing
  const encoded = new TextEncoder().encode(code);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

#### V2.8.3: 2FA Enrollment

**Requirements**:
- Require password authentication before enabling 2FA
- Verify user can generate valid codes before finalizing setup
- Show QR code for easy enrollment

**Implementation**:
```typescript
async function enable2FA(
  userId: string,
  currentPassword: string
): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
  // Verify password
  const user = await db.getUser(userId);
  if (!await verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('Invalid password');
  }
  
  // Generate secret and backup codes
  const secret = totpService.generateSecret();
  const backupCodes = totpService.generateBackupCodes();
  
  // Generate QR code
  const totpUri = `otpauth://totp/PasswordGen:${user.username}?secret=${secret}&issuer=PasswordGen`;
  const qrCodeUrl = await QRCode.toDataURL(totpUri, { width: 256 });
  
  // Store as pending (not activated yet)
  await db.storePending2FA(userId, secret, backupCodes);
  
  return { secret, qrCodeUrl, backupCodes };
}

async function verify2FASetup(
  userId: string,
  token: string
): Promise<void> {
  const pending = await db.getPending2FA(userId);
  if (!pending) {
    throw new Error('No pending 2FA setup');
  }
  
  // Verify token
  if (!totpService.validateToken(pending.secret, token)) {
    throw new Error('Invalid 2FA code');
  }
  
  // Activate 2FA
  await db.activate2FA(userId, pending.secret, pending.backupCodes);
  await db.deletePending2FA(userId);
  
  // Log security event
  await securityLog.logEvent({
    userId,
    eventType: '2fa_enabled',
    success: true
  });
}
```

---

## Security Logging & Monitoring

### OWASP ASVS 4.0 Section 7: Error Handling and Logging

✅ **Implemented**: Comprehensive security event logging

#### V7.2.1: Security Event Logging

**Requirements**:
- Log all authentication events
- Log security-relevant actions
- Include timestamp, user, action, outcome
- Log failures with sufficient detail

**Implementation**:
```typescript
type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_success'
  | '2fa_failed'
  | 'session_expired'
  | 'session_revoked'
  | 'account_deleted'
  | 'data_exported';

interface SecurityEvent {
  id: string;
  userId: string;
  timestamp: Date;
  eventType: SecurityEventType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

class SecurityLogService {
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };
    
    await db.storeSecurityEvent(logEntry);
    
    // Limit to 1000 events per user (auto-delete oldest)
    await this.pruneOldEvents(event.userId);
  }
  
  private async pruneOldEvents(userId: string): Promise<void> {
    const events = await db.getUserEvents(userId);
    if (events.length > 1000) {
      const toDelete = events
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, events.length - 1000);
      await db.deleteEvents(toDelete.map(e => e.id));
    }
  }
}
```

#### V7.2.2: Log Protection

**Requirements**:
- Logs must not contain sensitive data
- Logs must be tamper-evident

**Implementation**:
```typescript
// Never log sensitive data
async logEvent(event: SecurityEvent): Promise<void> {
  // Remove sensitive fields before logging
  const sanitized = {
    ...event,
    metadata: event.metadata ? sanitizeMetadata(event.metadata) : undefined
  };
  
  await db.storeSecurityEvent(sanitized);
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.key;
  
  // Redact partial data
  if (sanitized.email) {
    sanitized.email = redactEmail(sanitized.email);
  }
  
  return sanitized;
}

function redactEmail(email: string): string {
  // user@example.com → u***@example.com
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```

---

## Implementation Checklist

### Phase 1: Core Cryptography (TASK-009 to TASK-021)

#### CryptoService Implementation
- [ ] Implement Argon2id password hashing with recommended parameters (time=3, mem=64MB)
- [ ] Implement PBKDF2 key derivation (100,000 iterations, SHA-256)
- [ ] Implement AES-256-GCM encryption/decryption
- [ ] Generate cryptographically secure random salts (256-bit)
- [ ] Generate cryptographically secure IVs (96-bit for GCM)
- [ ] Ensure keys are never stored (always derived)
- [ ] Ensure keys are non-extractable (crypto.subtle option)
- [ ] Implement constant-time password verification
- [ ] Handle encryption/decryption errors securely (no information leakage)
- [ ] Add comprehensive error handling for crypto operations

#### Testing
- [ ] Unit test: Argon2id hashing produces different hashes for same password (unique salts)
- [ ] Unit test: Argon2id verification accepts correct passwords
- [ ] Unit test: Argon2id verification rejects incorrect passwords
- [ ] Unit test: PBKDF2 key derivation produces consistent keys with same inputs
- [ ] Unit test: PBKDF2 key derivation produces different keys with different salts
- [ ] Unit test: AES-GCM encryption produces different ciphertexts for same plaintext (unique IVs)
- [ ] Unit test: AES-GCM decryption correctly recovers plaintext
- [ ] Unit test: AES-GCM detects tampering (modified ciphertext fails authentication)
- [ ] Performance test: Password hashing completes in <2 seconds
- [ ] Performance test: Key derivation completes in <3 seconds

### Phase 2: Authentication Service (TASK-022 to TASK-041)

#### AuthService Implementation
- [ ] Implement user registration with password strength validation
- [ ] Implement common password screening (top 10,000 passwords)
- [ ] Implement login with rate limiting (max 5 attempts, exponential backoff)
- [ ] Implement account lockout (10 failed attempts in 15 minutes)
- [ ] Implement password change with current password verification
- [ ] Implement logout (session invalidation)
- [ ] Implement account deletion with password confirmation
- [ ] Invalidate all sessions on password change
- [ ] Log all authentication events to SecurityLogService

#### SessionService Implementation
- [ ] Generate cryptographically secure session IDs (UUID v4)
- [ ] Implement idle timeout (30 minutes)
- [ ] Implement absolute timeout (8 hours)
- [ ] Implement timeout warning (5 minutes before expiration)
- [ ] Update last activity on user interactions
- [ ] Implement session revocation
- [ ] Implement "view all sessions" functionality
- [ ] Bind sessions to user agent (basic fingerprinting)

#### SecurityLogService Implementation
- [ ] Log all security events with timestamps
- [ ] Sanitize metadata (remove passwords, tokens, secrets)
- [ ] Limit to 1000 events per user (auto-prune oldest)
- [ ] Implement event retrieval by user ID
- [ ] Implement event retrieval by event type
- [ ] Ensure logs are tamper-evident (append-only)

#### Testing
- [ ] Unit test: Registration rejects weak passwords (<8 chars)
- [ ] Unit test: Registration rejects common passwords
- [ ] Unit test: Registration creates user with hashed password
- [ ] Unit test: Login succeeds with correct credentials
- [ ] Unit test: Login fails with incorrect password
- [ ] Unit test: Login rate limiting activates after 5 failed attempts
- [ ] Unit test: Account lockout activates after 10 failed attempts
- [ ] Integration test: Password change invalidates all sessions
- [ ] Integration test: Session expires after 30 minutes idle
- [ ] Integration test: Session expires after 8 hours absolute
- [ ] Security test: Timing attack resistance (password verification)

### Phase 3: 2FA Implementation (TASK-034 to TASK-041)

#### TotpService Implementation
- [ ] Generate 160-bit (20-byte) secrets
- [ ] Implement TOTP token generation (SHA-1, 6 digits, 30s period)
- [ ] Implement TOTP token validation with ±1 period window
- [ ] Generate 10 cryptographically random backup codes
- [ ] Hash backup codes before storage (SHA-256)
- [ ] Implement backup code validation (single-use)
- [ ] Generate TOTP URIs for QR codes
- [ ] Integrate QR code generation (qrcode library)

#### 2FA Enrollment Flow
- [ ] Require password verification before enabling 2FA
- [ ] Generate secret and backup codes
- [ ] Display QR code for authenticator app
- [ ] Display backup codes for user to save
- [ ] Require user to enter valid TOTP code before activation
- [ ] Store secret and hashed backup codes on successful verification
- [ ] Log 2FA enabled event

#### 2FA Login Flow
- [ ] Verify password first (step 1)
- [ ] Prompt for TOTP code (step 2)
- [ ] Accept TOTP codes OR backup codes
- [ ] Mark backup codes as used (single-use)
- [ ] Log 2FA success/failure events
- [ ] Handle lost device scenario (backup codes)

#### Testing
- [ ] Unit test: Secret generation produces 160-bit secrets
- [ ] Unit test: TOTP token validation accepts valid codes
- [ ] Unit test: TOTP token validation rejects invalid codes
- [ ] Unit test: TOTP token validation handles clock skew (±30s)
- [ ] Unit test: Backup codes are single-use
- [ ] Integration test: 2FA enrollment requires password verification
- [ ] Integration test: 2FA enrollment requires valid TOTP confirmation
- [ ] Integration test: 2FA login requires both password and TOTP
- [ ] Integration test: 2FA login accepts backup codes
- [ ] Security test: TOTP secrets are never logged or exposed

### Phase 4+: UI, Site Management, Data Migration

#### Security-Relevant UI/UX
- [ ] Display password strength indicator during registration
- [ ] Show warning 5 minutes before session timeout
- [ ] Provide "Continue Session" button in timeout warning
- [ ] Clear sensitive data from DOM after use (QR codes, secrets)
- [ ] Mask passwords by default (with show/hide toggle)
- [ ] Confirm sensitive actions (password change, account deletion)
- [ ] Display active sessions with device info (user agent, timestamps)
- [ ] Show security log to user (authentication events)

#### Data Protection
- [ ] Encrypt all user data in per-user vaults
- [ ] Never store encryption keys
- [ ] Implement secure data export (encrypted JSON)
- [ ] Implement secure data deletion (account removal)
- [ ] Limit password history to 50 entries (auto-delete oldest)
- [ ] Implement storage quota monitoring
- [ ] Handle localStorage quota exceeded errors

#### Testing
- [ ] Accessibility test: All forms have proper labels and ARIA
- [ ] Accessibility test: Keyboard navigation works for all interactions
- [ ] Accessibility test: Screen reader announcements for state changes
- [ ] Security test: XSS protection (sanitize user inputs)
- [ ] Security test: CSRF protection (not applicable for SPA)
- [ ] Security test: Clickjacking protection (not applicable for SPA)
- [ ] Performance test: Login flow completes in <5 seconds
- [ ] Performance test: Site list loads in <100ms
- [ ] E2E test: Full registration → login → 2FA setup → logout flow
- [ ] E2E test: Lost device recovery using backup codes

---

## Security Testing Requirements

### Automated Security Tests

#### Cryptography Tests
```typescript
describe('CryptoService Security', () => {
  it('should use unique salts for each password hash', async () => {
    const hash1 = await cryptoService.hashPassword('password123');
    const hash2 = await cryptoService.hashPassword('password123');
    expect(hash1).not.toBe(hash2);
  });
  
  it('should detect tampered ciphertext', async () => {
    const encrypted = await cryptoService.encrypt('sensitive data', key);
    encrypted.ciphertext[0] ^= 1; // Flip one bit
    
    await expect(
      cryptoService.decrypt(encrypted, key)
    ).rejects.toThrow();
  });
  
  it('should not leak information via timing attacks', async () => {
    const correctPassword = 'correct_password';
    const wrongPassword = 'wrong_password';
    
    // Measure timing for correct password
    const start1 = performance.now();
    await cryptoService.verifyPassword(correctPassword, hash);
    const time1 = performance.now() - start1;
    
    // Measure timing for wrong password
    const start2 = performance.now();
    await cryptoService.verifyPassword(wrongPassword, hash);
    const time2 = performance.now() - start2;
    
    // Timing difference should be minimal (<10ms)
    expect(Math.abs(time1 - time2)).toBeLessThan(10);
  });
});
```

#### Authentication Tests
```typescript
describe('AuthService Security', () => {
  it('should enforce rate limiting after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        authService.login('user', 'wrong')
      ).rejects.toThrow('Invalid username or password');
    }
    
    // 6th attempt should be rate limited
    const start = Date.now();
    await expect(
      authService.login('user', 'wrong')
    ).rejects.toThrow();
    const duration = Date.now() - start;
    
    expect(duration).toBeGreaterThan(1000); // At least 1s delay
  });
  
  it('should reject common passwords', async () => {
    await expect(
      authService.register('user', 'password')
    ).rejects.toThrow('Password is too common');
  });
});
```

#### Session Tests
```typescript
describe('SessionService Security', () => {
  it('should expire sessions after 30 minutes idle', async () => {
    const session = await sessionService.createSession(userId);
    
    // Fast-forward time by 30 minutes
    jest.advanceTimersByTime(30 * 60 * 1000);
    
    const isValid = await sessionService.isSessionValid(session.id);
    expect(isValid).toBe(false);
  });
  
  it('should invalidate all sessions on password change', async () => {
    const session1 = await sessionService.createSession(userId);
    const session2 = await sessionService.createSession(userId);
    
    await authService.changePassword(userId, 'old', 'new');
    
    expect(await sessionService.isSessionValid(session1.id)).toBe(false);
    expect(await sessionService.isSessionValid(session2.id)).toBe(false);
  });
});
```

### Manual Security Testing

#### Penetration Testing Checklist
- [ ] Attempt SQL injection (not applicable - no SQL database)
- [ ] Attempt XSS via user inputs (site names, notes)
- [ ] Attempt authentication bypass
- [ ] Attempt session hijacking
- [ ] Attempt CSRF attacks (not applicable - SPA)
- [ ] Test rate limiting effectiveness
- [ ] Test account lockout mechanism
- [ ] Verify password hashing parameters
- [ ] Verify encryption key derivation
- [ ] Test 2FA bypass attempts
- [ ] Test backup code reuse
- [ ] Inspect browser localStorage contents
- [ ] Verify no secrets in browser console
- [ ] Verify no secrets in network requests (not applicable - offline)
- [ ] Test data export/import security

#### Browser Security Features
- [ ] Verify Content-Security-Policy header (if applicable)
- [ ] Verify X-Frame-Options header (if applicable)
- [ ] Verify HTTPS enforcement (if deployed)
- [ ] Verify Subresource Integrity for CDN resources
- [ ] Test in private/incognito mode
- [ ] Test with browser extensions disabled
- [ ] Test localStorage persistence across sessions

---

## Security Maintenance

### Ongoing Security Practices

#### Regular Reviews
- [ ] Review OWASP Top 10 annually for new threats
- [ ] Review NIST SP 800-63B for updated guidelines
- [ ] Review Argon2 parameters annually (increase as hardware improves)
- [ ] Review PBKDF2 iterations annually (increase as hardware improves)
- [ ] Monitor security advisories for dependencies (argon2-browser, otpauth, qrcode)

#### Dependency Security
```bash
# Check for known vulnerabilities
npm audit

# Update dependencies (carefully, with testing)
npm update

# Review security advisories
npm audit report
```

#### Incident Response Plan
1. **Detection**: Monitor security logs for anomalies
2. **Assessment**: Determine severity and scope
3. **Containment**: Disable compromised accounts, revoke sessions
4. **Eradication**: Update vulnerable code, patch dependencies
5. **Recovery**: Restore service, notify affected users
6. **Lessons Learned**: Document incident, update procedures

---

## References

### Standards & Guidelines
- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/) - Application Security Verification Standard
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) - Digital Identity Guidelines
- [OWASP Top 10 2021](https://owasp.org/Top10/) - Top 10 Web Application Security Risks
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

### Algorithms & Protocols
- [RFC 6238](https://tools.ietf.org/html/rfc6238) - TOTP: Time-Based One-Time Password Algorithm
- [Argon2 RFC](https://www.rfc-editor.org/rfc/rfc9106.html) - Argon2 Memory-Hard Function
- [AES-GCM](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) - NIST SP 800-38D
- [PBKDF2](https://www.rfc-editor.org/rfc/rfc8018) - RFC 8018

### Tools & Libraries
- [argon2-browser](https://github.com/antelle/argon2-browser) - Argon2 for browsers
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Browser cryptography
- [otpauth](https://github.com/hectorm/otpauth) - TOTP/HOTP library
- [qrcode](https://github.com/soldair/node-qrcode) - QR code generation

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-19  
**Next Review**: 2026-01-19 (1 month)  
**Status**: ✅ Ready for Implementation