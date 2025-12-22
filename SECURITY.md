# Security Model

This document describes the security architecture, cryptographic implementation, and threat model for the Password Manager application.

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [Threat Model](#threat-model)
- [Cryptographic Implementation](#cryptographic-implementation)
- [Authentication System](#authentication-system)
- [Encryption Architecture](#encryption-architecture)
- [Session Management](#session-management)
- [Two-Factor Authentication](#two-factor-authentication)
- [Data Storage](#data-storage)
- [Security Controls](#security-controls)
- [Known Limitations](#known-limitations)
- [Best Practices for Users](#best-practices-for-users)
- [Security Audit & Testing](#security-audit--testing)

---

## Security Philosophy

### Core Principles

1. **Zero-Knowledge**: Your master password never leaves your device
2. **Local-Only**: All data stored in browser IndexedDB—no servers, no cloud
3. **Defense in Depth**: Multiple layers of security controls
4. **Privacy First**: Zero telemetry, tracking, or analytics
5. **Transparency**: Open-source implementation for community review

### Design Goals

- Protect against unauthorized access to the password vault
- Prevent data exfiltration even if device is compromised
- Mitigate risks of weak passwords through enforcement and guidance
- Provide secure session management without usability sacrifice
- Enable optional 2FA for high-security requirements

---

## Threat Model

### What We Protect Against

✅ **In-Scope Threats**:

1. **Unauthorized Access**: Attackers attempting to access vault without credentials
2. **Brute Force Attacks**: Automated password guessing attacks
3. **Session Hijacking**: Stealing or predicting session tokens
4. **Data Exfiltration**: Extracting vault data from browser storage
5. **Weak Passwords**: Users choosing easily guessable passwords
6. **Password Reuse**: Users reusing master password elsewhere
7. **Credential Stuffing**: Attackers using leaked credentials from other services
8. **Man-in-the-Middle** (MITM): Intercepting traffic between browser and app

### What We Don't Protect Against

⚠️ **Out-of-Scope Threats**:

1. **Device Compromise**: Malware, keyloggers, or physical access to unlocked device
2. **Browser Vulnerabilities**: Zero-day exploits in browser engines
3. **Supply Chain Attacks**: Compromised dependencies or build process
4. **Side-Channel Attacks**: Timing attacks, cache attacks, power analysis
5. **Coercion**: Physical threats or legal compulsion to reveal passwords
6. **User Error**: Weak master passwords, password sharing, phishing
7. **Memory Forensics**: Extracting keys from RAM on compromised devices

### Assumptions

- User's device is reasonably secure (no active malware)
- Browser implementation of Web Crypto API is trustworthy
- User follows best practices (strong master password, device security)
- HTTPS is used in production (Web Crypto API requirement)

---

## Cryptographic Implementation

### Password Hashing

**Algorithm**: Argon2id (Argon2 version 1.3, hybrid mode)

**Parameters**:
```typescript
{
  memory: 65536,      // 64 MiB memory cost
  iterations: 3,       // Time cost (iterations)
  parallelism: 1,      // Parallelism factor
  hashLength: 32,      // 32-byte output (256 bits)
  saltLength: 16       // 16-byte random salt per user
}
```

**Justification**:
- **Argon2id**: Winner of Password Hashing Competition (2015)
- **Hybrid Mode**: Combines Argon2i (side-channel resistant) and Argon2d (GPU resistant)
- **OWASP Recommended**: Meets OWASP password storage guidelines
- **Memory-Hard**: Resistant to GPU/ASIC attacks (64 MB per hash)
- **Configurable Cost**: Balanced for ~500ms computation time on typical devices

**Implementation**:
```typescript
// From AuthService.ts
import argon2 from 'argon2-browser';

const hash = await argon2.hash({
  pass: password,
  salt: randomSalt,
  type: argon2.ArgonType.Argon2id,
  mem: 65536,
  time: 3,
  parallelism: 1,
  hashLen: 32
});
```

**Salt Generation**:
- Unique random 16-byte salt per user
- Generated using Web Crypto API: `crypto.getRandomValues(new Uint8Array(16))`
- Stored alongside password hash in database

### Encryption

**Algorithm**: AES-256-GCM (Advanced Encryption Standard, Galois/Counter Mode)

**Key Derivation**:
```typescript
// Encryption key derived from master password
const keyMaterial = await argon2.hash({
  pass: masterPassword,
  salt: userSalt,
  type: argon2.ArgonType.Argon2id,
  mem: 65536,
  time: 3,
  parallelism: 1,
  hashLen: 32  // 256-bit key
});

const encryptionKey = await crypto.subtle.importKey(
  'raw',
  keyMaterial.hash,
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt']
);
```

**Justification**:
- **AES-256**: Industry standard, NIST approved
- **GCM Mode**: Authenticated encryption (provides both confidentiality and integrity)
- **96-bit IV**: Unique initialization vector per encryption operation
- **128-bit Auth Tag**: Detects tampering/corruption

**IV Generation**:
- Unique random 96-bit (12-byte) IV per encryption
- Generated using Web Crypto API: `crypto.getRandomValues(new Uint8Array(12))`
- Prepended to ciphertext for decryption

**Encryption Process**:
```typescript
// From CryptoService.ts
async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Prepend IV to ciphertext (IV:Ciphertext:AuthTag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}
```

**Decryption Process**:
```typescript
async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and ciphertext (remaining)
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}
```

### Random Number Generation

**All random values use Web Crypto API**:
```typescript
// Session tokens (32 bytes)
const token = crypto.getRandomValues(new Uint8Array(32));

// Salts (16 bytes)
const salt = crypto.getRandomValues(new Uint8Array(16));

// IVs (12 bytes for AES-GCM)
const iv = crypto.getRandomValues(new Uint8Array(12));

// 2FA secrets (20 bytes, Base32 encoded)
const secret = crypto.getRandomValues(new Uint8Array(20));
```

**Justification**:
- Cryptographically secure pseudorandom number generator (CSPRNG)
- Hardware-backed when available
- Suitable for cryptographic operations
- No predictable patterns or biases

---

## Authentication System

### Registration Flow

1. **Username Validation**: Check uniqueness, format
2. **Password Strength Check**: Zxcvbn score ≥3 required
3. **Salt Generation**: Unique 16-byte random salt via Web Crypto API
4. **Password Hashing**: Argon2id with user's salt (see Cryptographic Implementation)
5. **User Creation**: Store `{ username, passwordHash, salt, createdAt }`
6. **Session Creation**: Generate session token, set expiration
7. **Return Session**: User logged in automatically

### Login Flow

1. **Lookup User**: Retrieve user by username
2. **Account Lockout Check**: Verify not locked (5 failed attempts → 15-minute lockout)
3. **Password Verification**: Hash provided password with user's salt, compare to stored hash
4. **2FA Verification** (if enabled): Validate TOTP code
5. **Failed Attempt Handling**: Increment failed attempts, lock account if threshold exceeded
6. **Activity Logging**: Record login timestamp, IP (if available), success/failure
7. **Session Creation**: Generate new session token on success
8. **Reset Failed Attempts**: Clear failed attempt counter on successful login

### Password Requirements

- **Minimum Length**: 8 characters (12+ recommended)
- **Strength Score**: Zxcvbn score ≥3 (out of 4)
  - Score 0-1: Weak (rejected)
  - Score 2: Fair (rejected)
  - Score 3: Good (accepted)
  - Score 4: Strong (accepted)
- **No Common Passwords**: Zxcvbn checks against common password lists
- **Real-Time Feedback**: Strength meter and suggestions during registration

---

## Encryption Architecture

### Zero-Knowledge Architecture

**Key Principle**: Your master password never leaves your device, and the application never has access to your unencrypted vault.

**How It Works**:

1. **Key Derivation**: Encryption key derived from master password using Argon2id
2. **Vault Encryption**: All vault data encrypted with this key using AES-256-GCM
3. **Key Never Stored**: Encryption key exists only in memory during session
4. **Key Destroyed**: Key destroyed when session ends (logout, timeout, browser close)

**Data Flow**:

```
Master Password (known only to user)
        ↓
    Argon2id (with user salt)
        ↓
  Encryption Key (256-bit AES key, memory only)
        ↓
    AES-GCM Encryption
        ↓
  Encrypted Vault (stored in IndexedDB)
```

### Vault Encryption

**What's Encrypted**:
- Site passwords (most sensitive)
- Site usernames
- Site URLs
- Site notes/descriptions

**What's NOT Encrypted**:
- Site names (used for search/display)
- User metadata (username, registration date)
- Session tokens (already cryptographically secure random values)
- Activity logs (timestamps, login outcomes)

**Per-User Isolation**:
- Each user has unique salt → unique encryption key
- Users cannot decrypt each other's vaults
- Even with same password, different salts produce different keys

### Encryption Key Lifecycle

1. **Session Start** (Login):
   - User enters master password
   - Key derived from password + salt (Argon2id)
   - Key held in memory for session duration

2. **During Session**:
   - Key used for encrypt/decrypt operations on-demand
   - Key never written to disk or persistent storage
   - Key not transmitted over network

3. **Session End** (Logout):
   - Key explicitly cleared from memory
   - Session token invalidated
   - User must re-enter password to derive key again

---

## Session Management

### Session Token Generation

```typescript
// From SessionService.ts
async function createSession(userId: number): Promise<string> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...tokenBytes));
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.sessions.create({
    userId,
    token,
    expiresAt,
    lastActivityAt: new Date()
  });
  
  return token;
}
```

**Token Properties**:
- **Length**: 32 bytes (256 bits)
- **Encoding**: Base64 for storage/transmission
- **Entropy**: 256 bits (cryptographically strong)
- **Expiration**: 24 hours from creation (configurable)
- **Activity Extension**: Updates on user activity

### Session Validation

```typescript
async function validateSession(token: string): Promise<Session | null> {
  const session = await db.sessions.findByToken(token);
  
  if (!session) return null;
  if (new Date() > session.expiresAt) {
    await db.sessions.delete(session.id);
    return null;
  }
  
  // Update last activity
  await db.sessions.update(session.id, {
    lastActivityAt: new Date()
  });
  
  return session;
}
```

**Validation Checks**:
- Session token exists in database
- Session not expired (current time < expiresAt)
- User account still exists and not deleted
- Session not explicitly invalidated

### Session Expiration

**Timeout**: 24 hours from creation
**Activity Extension**: Last activity timestamp updated on user actions
**Explicit Logout**: Token deleted immediately
**Concurrent Sessions**: Multiple sessions allowed (different devices/browsers)

### Session Security

- **Random Tokens**: No predictable patterns
- **Database-Backed**: Token validity checked against database (not client-side JWT)
- **Expiration Enforced**: Old sessions automatically invalidated
- **Logout Cleanup**: Tokens deleted, not just expired
- **No Token Refresh**: New login required after expiration (prevents indefinite sessions)

---

## Two-Factor Authentication

### TOTP Implementation

**Standard**: RFC 6238 (Time-Based One-Time Password)
**Algorithm**: HMAC-SHA1 (as per RFC 6238)
**Secret Length**: 20 bytes (160 bits)
**Time Step**: 30 seconds
**Code Length**: 6 digits
**Window**: ±1 time step (allowing 30-second clock drift)

### 2FA Setup Flow

1. **Generate Secret**: 20 random bytes via Web Crypto API
2. **Base32 Encode**: Encode secret for QR code compatibility
3. **Generate QR Code**: `otpauth://totp/AppName:username?secret=BASE32SECRET&issuer=AppName`
4. **Generate Backup Codes**: 10 single-use backup codes (8-character alphanumeric)
5. **User Scans QR**: User scans with authenticator app (Authy, Google Authenticator, etc.)
6. **Verification**: User enters TOTP code to confirm setup
7. **Store Encrypted**: Secret and backup codes stored encrypted in database

### 2FA Login Flow

1. **Username/Password**: Validate credentials first
2. **Check 2FA Status**: If enabled, prompt for TOTP code
3. **Validate TOTP**: Check current code and ±1 time step window
4. **Backup Code Fallback**: Allow backup code if TOTP fails
5. **Invalidate Used Backup Code**: Mark backup code as used (single-use)
6. **Failed Attempt Tracking**: Count toward account lockout threshold

### TOTP Validation

```typescript
// From TwoFactorService.ts
async function validateTOTP(secret: string, code: string): Promise<boolean> {
  const totp = new TOTP({ secret });
  
  // Check current time step and ±1 step (30 seconds each)
  const currentCode = totp.generate();
  const previousCode = totp.generate({ timestamp: Date.now() - 30000 });
  const nextCode = totp.generate({ timestamp: Date.now() + 30000 });
  
  return code === currentCode || code === previousCode || code === nextCode;
}
```

### Backup Codes

**Format**: 8-character alphanumeric (e.g., `A3B7C9D2`)
**Quantity**: 10 codes generated during setup
**Single-Use**: Each code can only be used once
**Storage**: Hashed before storage (not reversible)
**Regeneration**: User can regenerate all backup codes (invalidates old ones)

**Backup Code Validation**:
```typescript
async function validateBackupCode(userId: number, code: string): Promise<boolean> {
  const backupCodes = await db.backupCodes.findByUserId(userId);
  
  for (const stored of backupCodes) {
    if (await argon2.verify(stored.hashedCode, code)) {
      if (stored.used) return false; // Already used
      
      await db.backupCodes.markUsed(stored.id);
      return true;
    }
  }
  
  return false;
}
```

---

## Data Storage

### IndexedDB Structure

**Database**: `passwordgen`

**Tables** (Object Stores):

1. **users**
   - `id`: Auto-increment primary key
   - `username`: Unique username
   - `passwordHash`: Argon2id hash
   - `salt`: Unique salt (hex string)
   - `twoFactorEnabled`: Boolean
   - `twoFactorSecret`: Encrypted TOTP secret (if enabled)
   - `failedLoginAttempts`: Counter
   - `accountLockedUntil`: Timestamp or null
   - `createdAt`: Registration timestamp

2. **sessions**
   - `id`: Auto-increment primary key
   - `userId`: Foreign key to users
   - `token`: Session token (Base64)
   - `expiresAt`: Expiration timestamp
   - `lastActivityAt`: Last activity timestamp
   - `createdAt`: Session creation timestamp

3. **sites**
   - `id`: Auto-increment primary key
   - `userId`: Foreign key to users
   - `name`: Site name (plaintext)
   - `url`: Site URL (encrypted)
   - `username`: Username (encrypted)
   - `password`: Password (encrypted)
   - `notes`: Notes (encrypted)
   - `createdAt`: Creation timestamp
   - `updatedAt`: Last update timestamp

4. **activity**
   - `id`: Auto-increment primary key
   - `userId`: Foreign key to users
   - `action`: Action type (`login_success`, `login_failure`, `logout`, etc.)
   - `timestamp`: Action timestamp
   - `metadata`: JSON metadata (IP, browser, etc.)

5. **history**
   - `id`: Auto-increment primary key
   - `type`: `password` or `passphrase`
   - `value`: Generated value (plaintext—legacy from v1.x)
   - `config`: JSON config (length, options, etc.)
   - `createdAt`: Generation timestamp

6. **migrations**
   - `id`: Migration filename
   - `appliedAt`: Timestamp when migration applied

### Data Encryption at Rest

**Encrypted Fields**:
- `sites.url`
- `sites.username`
- `sites.password`
- `sites.notes`
- `users.twoFactorSecret`

**Unencrypted Fields** (for functionality):
- `sites.name` (needed for search/display)
- `users.username` (needed for login lookup)
- `sessions.token` (already cryptographically secure random)
- Activity logs (timestamps, outcomes)

### Storage Quotas

**Browser Limits**:
- Chrome: ~60% of available disk space
- Firefox: Up to 2GB (default), user prompt for more
- Safari: ~1GB, user prompt for more

**Quota Monitoring**:
```typescript
// From utils/storage.ts
async function checkStorageQuota(): Promise<void> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = (usage / quota) * 100;
    
    if (percentUsed > 80) {
      console.warn(`Storage ${percentUsed.toFixed(1)}% full`);
      // Show user warning
    }
  }
}
```

---

## Security Controls

### Account Lockout

**Trigger**: 5 failed login attempts
**Lockout Duration**: 15 minutes
**Reset**: Successful login resets counter

**Implementation**:
```typescript
async function handleFailedLogin(userId: number): Promise<void> {
  const user = await db.users.findById(userId);
  
  user.failedLoginAttempts += 1;
  
  if (user.failedLoginAttempts >= 5) {
    user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  
  await db.users.update(user);
}
```

**Bypass**: Lockout is time-based—after 15 minutes, counter not reset until successful login.

### Rate Limiting

⚠️ **Not Implemented**: Client-side application has no server-side rate limiting.

**Future Enhancement**:
- If deployed with backend, implement rate limiting on authentication endpoints
- Consider exponential backoff for repeated failures
- IP-based rate limiting for API endpoints

### Input Validation

**Username**:
- Length: 3-50 characters
- Allowed: Alphanumeric, underscores, hyphens, @, .
- No leading/trailing whitespace

**Password**:
- Minimum length: 8 characters
- Maximum length: 128 characters
- Zxcvbn strength score ≥3

**Site Fields**:
- Name: Required, max 100 characters
- URL: Optional, must be valid URL format
- Username: Optional, max 100 characters
- Password: Required, max 1000 characters
- Notes: Optional, max 5000 characters

### XSS Protection

**Content Security Policy** (CSP):
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:; 
               connect-src 'self';">
```

**Output Encoding**:
- All user input sanitized before rendering
- HTML entities escaped: `< > & " '`
- No `innerHTML` usage with user data
- Use `textContent` for text rendering

**DOM Sanitization**:
```typescript
function sanitizeHTML(input: string): string {
  const div = document.createElement('div');
  div.textContent = input; // Automatically escapes HTML
  return div.innerHTML;
}
```

### CSRF Protection

⚠️ **Not Applicable**: No server-side APIs to protect.

**If Backend Added**:
- Implement CSRF tokens for state-changing operations
- Use SameSite cookies
- Verify Origin/Referer headers

---

## Known Limitations

### 1. Browser Security Dependency

**Risk**: Security relies on browser implementation of Web Crypto API
**Mitigation**: Use only modern, up-to-date browsers
**Residual Risk**: Browser vulnerabilities could expose keys/data

### 2. Local Device Compromise

**Risk**: Malware, keyloggers, or physical access can steal data
**Mitigation**: User education, device security best practices
**Residual Risk**: Cannot protect against compromised device

### 3. Memory Forensics

**Risk**: Encryption keys exist in memory during session
**Mitigation**: Keys cleared on logout, but not securely wiped from RAM
**Residual Risk**: Memory dumps could reveal keys (requires significant access)

### 4. No Server-Side Rate Limiting

**Risk**: Client-side lockout can be bypassed (clear IndexedDB)
**Mitigation**: Account lockout still applies within same browser/session
**Residual Risk**: Attacker can clear data and retry

### 5. No Account Recovery

**Risk**: Forgotten master password = permanent data loss
**Mitigation**: User education, strong password storage recommendations
**Residual Risk**: Users may lose access to their vaults

### 6. Single Device (No Sync)

**Risk**: Data tied to single browser/device
**Mitigation**: Manual export/import (when implemented)
**Residual Risk**: Device loss/failure = data loss

### 7. No Breach Detection

**Risk**: Application cannot detect if passwords have been breached
**Mitigation**: Future integration with Have I Been Pwned API
**Residual Risk**: Users may unknowingly use compromised passwords

---

## Best Practices for Users

### 1. Master Password

- **Strength**: Use a strong, unique master password (12+ characters, mix of types)
- **Storage**: Store master password securely (physical secure location, separate password manager)
- **Uniqueness**: Never reuse master password elsewhere
- **Recovery**: No recovery option—memorize or store securely

### 2. Two-Factor Authentication

- **Enable 2FA**: Strongly recommended for enhanced security
- **Backup Codes**: Save backup codes in secure location separate from device
- **Authenticator App**: Use reputable app (Authy, Google Authenticator, 1Password)
- **Time Sync**: Ensure device clock is accurate (TOTP requires time sync)

### 3. Device Security

- **Lock Screen**: Always lock device when not in use
- **OS Updates**: Keep operating system updated
- **Antivirus**: Use reputable antivirus/anti-malware software
- **Physical Security**: Secure device from unauthorized physical access

### 4. Browser Security

- **Updates**: Keep browser updated to latest version
- **Extensions**: Minimize browser extensions, use only trusted ones
- **Private Browsing**: Consider using private/incognito mode for extra security
- **Clear Data**: Understand clearing browser data deletes vault

### 5. Vault Management

- **Regular Backups**: Export vault regularly (when feature available)
- **Password Rotation**: Rotate passwords periodically for critical sites
- **Review Access**: Regularly review login history for suspicious activity
- **Logout**: Always log out when finished, especially on shared devices

### 6. Network Security

- **HTTPS Only**: Only access application over HTTPS in production
- **Secure Networks**: Avoid public Wi-Fi for sensitive operations
- **VPN**: Consider VPN for extra privacy on untrusted networks

---

## Security Audit & Testing

### Testing Performed

✅ **Unit Tests**: 753 tests covering cryptographic functions, authentication, and encryption
✅ **Integration Tests**: End-to-end workflows (registration, login, vault operations, 2FA)
✅ **Accessibility Tests**: WCAG 2.1 AA compliance (@axe-core)
✅ **Code Review**: Manual security-focused code review
✅ **Dependency Audit**: `npm audit` for known vulnerabilities

### Testing Recommendations

🔸 **Recommended Before Production**:

1. **Penetration Testing**: Professional security assessment
2. **Code Audit**: Third-party security audit of cryptographic implementation
3. **Browser Testing**: Extensive testing across browsers and versions
4. **Device Testing**: Physical device testing (phones, tablets, various OS)
5. **Load Testing**: Stress testing with large vaults (1000+ sites)

### Vulnerability Reporting

**Security Issues**: Email security@example.com
**Response Time**: Within 48 hours
**Disclosure Policy**: Coordinated disclosure (90-day disclosure timeline)

### Security Updates

**Stay Informed**:
- Watch GitHub repository for security updates
- Subscribe to security mailing list (if available)
- Check release notes for security patches

---

## Conclusion

This password manager follows security best practices and industry standards for cryptography, authentication, and data protection. However, no system is perfectly secure. Users should:

- Understand the threat model and limitations
- Follow security best practices
- Keep software updated
- Report security issues responsibly

**Remember**: Your security is a shared responsibility between the application and you as the user. Store your master password securely, enable 2FA, and keep your device secure.

---

**Document Version**: 2.0  
**Last Updated**: 2024  
**Next Review**: Quarterly or upon significant changes
