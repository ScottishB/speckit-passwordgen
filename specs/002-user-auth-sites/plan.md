# Implementation Plan: User Authentication & Site Password Management

**Branch**: `002-user-auth-sites` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-user-auth-sites/spec.md`

## Summary

Add user authentication and site password management to the existing password generator application. Users must register/login to access their personal vault, optionally enable 2FA for enhanced security, and assign generated passwords to specific websites or IP addresses. All user data is cryptographically isolated using per-user encryption keys derived from master passwords. Sessions expire after 30 minutes of inactivity or 8 hours absolute time. Users can view, search, edit, and delete site entries, with password history maintained for the last 50 generated passwords per user.

**Technical Approach**: Extend existing Vite/TypeScript architecture with authentication layer, encryption service, and site management features. Use Web Crypto API for password hashing (Argon2id via argon2-browser) and per-user encryption keys (PBKDF2). Implement TOTP 2FA using otpauth library with QR code generation via qrcode. Migrate from localStorage to a structured multi-user data model with encrypted per-user vaults. Add session management with idle/absolute timeout tracking. Maintain existing accessibility (WCAG 2.1 AA) and responsive design standards.

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target), HTML5, CSS3  
**Primary Dependencies**: 
- **Existing**: Vite 5.x, Vitest, @axe-core/playwright
- **New**:
  - `argon2-browser` (Argon2id password hashing)
  - `otpauth` (TOTP 2FA implementation)
  - `qrcode` (QR code generation for 2FA setup)
  - `@types/qrcode` (TypeScript types)

**Storage**: Browser localStorage with encrypted per-user data vaults  
**Encryption**: 
- Password hashing: Argon2id via argon2-browser
- Data encryption: AES-GCM via Web Crypto API
- Key derivation: PBKDF2 (100,000 iterations) via Web Crypto API

**Testing**: 
- Vitest (unit tests for all new services)
- @axe-core/playwright (accessibility testing for new UI)
- Target: 80%+ code coverage for new code
- Security-specific tests for encryption, session management, 2FA

**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Single-page web application (extending existing)  
**Performance Goals**: 
- <100ms login/logout operations (excluding crypto operations)
- <50ms site list search/filter
- <200ms password assignment
- <500ms 2FA QR code generation
- Crypto operations (key derivation, encryption/decryption) may take 1-3 seconds - show loading states

**Constraints**: 
- Maintain offline-capable architecture
- Preserve existing accessibility standards (WCAG 2.1 AA)
- Keep responsive design (320px-2560px+ viewports)
- No breaking changes to existing password generator functionality
- Bundle size increase <200KB (gzipped)

**Security Standards**: 
- OWASP ASVS 4.0 (Application Security Verification Standard)
- NIST SP 800-63B (Digital Identity Guidelines)
- OWASP Top 10 2021 compliance
- See [SECURITY.md](./SECURITY.md) for complete security implementation guide

**Scale/Scope**: 
- Multi-user local application (same browser, different users)
- ~1500 lines of new TypeScript logic
- ~400 lines of new HTML/CSS
- 8 new UI components (Login, Register, 2FA Setup, Sites List, Site Detail, Site Edit, Settings, Account Management)
- 6 new services (AuthService, CryptoService, SessionService, TotpService, SiteService, SecurityLogService)
- 5 new models (User, Site, Session, SecurityEvent, EncryptedVault)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Accessibility (NON-NEGOTIABLE)
**Status**: ✅ PASS - Requirements Planned
- All new form controls (login, register, 2FA, site assignment) will have proper labels and ARIA attributes
- Keyboard navigation implemented for all new interactive elements (tab panels, modals, dropdowns)
- Color contrast ratios will meet WCAG 2.1 AA standards for all new UI
- Screen reader announcements for authentication state changes, session timeouts, copy confirmations
- Focus management for modal dialogs (trap focus, restore on close)
- Automated accessibility testing extended to cover new components
- Target: 100% accessibility test coverage for new features

### II. Readability
**Status**: ✅ PASS - Approach Defined
- Clear separation: services handle business logic, components handle UI
- Single Responsibility: each service has one focused purpose (auth, crypto, session, TOTP, sites)
- Descriptive naming: `deriveEncryptionKey()`, `validatePasswordStrength()`, `generateTOTPSecret()`
- Comments for crypto operations, session timeout logic, 2FA validation
- No "clever" crypto implementations - use well-tested libraries (argon2-browser, Web Crypto API, otpauth)
- Consistent error handling patterns across all new services

### III. Responsive Design
**Status**: ✅ PASS - Requirements Planned
- Reuse existing CSS Grid/Flexbox patterns for new components
- Modal dialogs responsive at all breakpoints (320px-2560px+)
- Login/register forms mobile-optimized (single column, large inputs)
- Site list adapts to viewport (cards on mobile, table on desktop)
- Touch targets minimum 44x44px for all new buttons/links
- QR codes scale appropriately for mobile scanning

### IV. Testing (NON-NEGOTIABLE)
**Status**: ✅ PASS - Strategy Defined
- **Unit Tests** (Vitest):
  - CryptoService: key derivation, encryption/decryption, password hashing
  - AuthService: registration, login, logout, validation
  - SessionService: idle timeout, absolute timeout, activity tracking
  - TotpService: secret generation, token validation, backup codes
  - SiteService: CRUD operations, search/filter, sorting
  - SecurityLogService: event logging, retrieval
- **Security Tests** (Vitest):
  - Timing attack resistance (password verification)
  - Tamper detection (AES-GCM authentication)
  - Rate limiting and account lockout
  - Session timeout and invalidation
  - Common password rejection
  - 2FA bypass prevention
- **Integration Tests** (Vitest):
  - Full registration flow (username → password → 2FA → login)
  - Session timeout scenarios (idle, absolute, concurrent sessions)
  - Site assignment workflow (generate → assign → view → edit)
  - Account deletion (data removal verification)
- **Accessibility Tests** (@axe-core):
  - All new forms and modals
  - Focus management in authentication flows
  - Screen reader compatibility
- **Security Tests**:
  - Encryption key isolation between users
  - Session token validation
  - 2FA lockout after failed attempts
  - Password strength validation
- Target: 80%+ code coverage for all new code

### V. Safety
**Status**: ✅ PASS - Process Followed
- Feature branch exists: 002-user-auth-sites
- This plan will be committed before implementation
- Data migration strategy: preserve existing GeneratedCredential data, associate with "default" user if needed
- Rollback plan: git revert, localStorage backup before migration
- No file deletions planned (only additions and modifications)
- Conventional commit messages for all changes

**Overall Gate Status**: ✅ PASS - Proceed to Phase 0

## Overall Approach / Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Main App Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Auth UI    │  │  Generator   │  │   Sites UI   │          │
│  │ (Login/Reg)  │  │   UI (001)   │  │   (Vault)    │          │
│  └───────┬──────┘  └──────┬───────┘  └──────┬───────┘          │
└──────────┼─────────────────┼──────────────────┼─────────────────┘
           │                 │                  │
┌──────────┼─────────────────┼──────────────────┼─────────────────┐
│          ▼                 ▼                  ▼                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              AuthService (Gatekeeper)                 │       │
│  │  - Check session validity before all operations      │       │
│  │  - Redirect to login if session expired              │       │
│  └────────┬──────────────────────────┬──────────────────┘       │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌────────────────┐        ┌────────────────┐                  │
│  │ SessionService │        │  CryptoService │                  │
│  │ - Idle timeout │        │ - Key derivation│                  │
│  │ - Absolute     │        │ - Encryption    │                  │
│  │ - Multi-session│        │ - Decryption    │                  │
│  └────────────────┘        └────────┬───────┘                  │
│                                     │                           │
│           ┌──────────────┬──────────┴─────────┬────────────┐   │
│           ▼              ▼                    ▼            ▼   │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐  ┌────────┐│
│  │ TotpService │  │SiteService │  │HistoryService│  │SecLog  ││
│  │ - 2FA logic │  │ - Site CRUD│  │ (modified)   │  │Service ││
│  └─────────────┘  └────────────┘  └──────────────┘  └────────┘│
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Data Layer (localStorage)                    │
│  ┌────────────┐  ┌──────────────────────────────────────┐       │
│  │   Users    │  │       Encrypted Per-User Vaults      │       │
│  │ (accounts) │  │  ┌────────────┐  ┌────────────┐      │       │
│  └────────────┘  │  │  User1     │  │  User2     │      │       │
│                  │  │  Sites     │  │  Sites     │      │       │
│  ┌────────────┐  │  │  History   │  │  History   │      │       │
│  │  Sessions  │  │  │  SecEvents │  │  SecEvents │      │       │
│  └────────────┘  │  └────────────┘  └────────────┘      │       │
│                  └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Authentication as Middleware**: AuthService acts as gatekeeper. All protected routes/components check session validity before rendering.

2. **Per-User Encryption**: Each user's master password derives a unique encryption key. User vaults are encrypted blobs in localStorage keyed by `vault_${userId}`.

3. **Session Management**: SessionService tracks both idle and absolute timeouts. On every user interaction, update `lastActivity`. Background interval checks for expiration every 30 seconds.

4. **Data Migration**: Existing `password-gen-credentials` localStorage data will be preserved and associated with a "legacy/anonymous" user or migrated to first registered user on prompt.

5. **Component Hierarchy**: 
   - AppComponent orchestrates routing (login → main app)
   - AuthGuard HOC wraps protected components
   - Existing generator components remain unchanged but now save to user-specific vault

## New Classes, Methods, and Modules

### New Models (`src/models/`)

#### `User.ts`
```typescript
export interface User {
  id: string;                    // UUID
  username: string;              // 3-50 chars, alphanumeric + underscore
  passwordHash: string;          // Argon2id hash
  salt: string;                  // Salt for key derivation
  totpSecret: string | null;     // Base32 TOTP secret (if 2FA enabled)
  backupCodes: string[];         // Hashed backup codes
  backupCodesUsed: string[];     // Track used backup codes
  createdAt: number;             // Timestamp
  lastLogin: number | null;      // Timestamp
  failedLoginAttempts: number;   // For rate limiting
  lockedUntil: number | null;    // Timestamp for account lockout
}
```

#### `Site.ts`
```typescript
export interface Site {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  siteName: string;              // Display name
  url: string;                   // URL or IP address
  username: string;              // Username for site
  password: string;              // The generated password (encrypted in storage)
  notes: string;                 // Max 500 chars
  createdAt: number;             // Timestamp
  lastModified: number;          // Timestamp
  isAssigned: boolean;           // Track if password has been assigned to site
}
```

#### `Session.ts`
```typescript
export interface Session {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  sessionToken: string;          // Random token
  createdAt: number;             // For absolute timeout
  lastActivity: number;          // For idle timeout
  expiresAt: number;             // Computed: min(idle + 30min, absolute + 8hr)
  deviceInfo: string;            // User agent string
  ipAddress: string;             // Client IP (if available, otherwise "local")
}
```

#### `SecurityEvent.ts`
```typescript
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

export interface SecurityEvent {
  id: string;                    // UUID
  userId: string;                // Foreign key to User
  eventType: SecurityEventType;
  timestamp: number;
  ipAddress: string;
  details: string;               // Additional context
}
```

#### `EncryptedVault.ts`
```typescript
export interface EncryptedVault {
  userId: string;
  encryptedData: string;         // Base64-encoded encrypted JSON
  iv: string;                    // Initialization vector for AES-GCM
  salt: string;                  // Salt used for key derivation
}

// Decrypted vault structure
export interface VaultData {
  sites: Site[];
  generatedPasswords: GeneratedCredential[]; // Existing model
  securityEvents: SecurityEvent[];
}
```

### New Services (`src/services/`)

#### `CryptoService.ts`

**Purpose**: Handle all cryptographic operations (hashing, encryption, key derivation)

**Key Methods**:
- `async hashPassword(password: string): Promise<string>` - Hash password using Argon2id
- `async verifyPassword(password: string, hash: string): Promise<boolean>` - Verify password against hash
- `async deriveEncryptionKey(masterPassword: string, salt: string): Promise<CryptoKey>` - Derive key using PBKDF2
- `async encryptData(data: any, key: CryptoKey): Promise<{encrypted: string, iv: string, salt: string}>` - Encrypt using AES-GCM
- `async decryptData(encrypted: string, iv: string, key: CryptoKey): Promise<any>` - Decrypt using AES-GCM
- `generateSalt(): string` - Generate cryptographically secure random salt
- `generateToken(): string` - Generate secure random token for sessions
- `generateUUID(): string` - Generate UUID v4

**Error Handling**: Throw `CryptoError` for encryption/decryption failures

---

#### `AuthService.ts`

**Purpose**: Handle user registration, login, logout, and session validation

**Key Methods**:
- `async register(username: string, password: string): Promise<User>` - Register new user
- `async login(username: string, password: string, totpCode?: string): Promise<Session>` - Authenticate and create session
- `async logout(sessionId: string): Promise<void>` - Invalidate session
- `getCurrentUser(): User | null` - Get currently authenticated user
- `getCurrentSession(): Session | null` - Get current session
- `isAuthenticated(): boolean` - Check if current session is valid
- `validatePasswordStrength(password: string): {valid: boolean, errors: string[]}` - Validate password strength
- `async isUsernameAvailable(username: string): Promise<boolean>` - Check username availability
- `async deleteAccount(userId: string, password: string): Promise<void>` - Delete account and all data

**Error Handling**: 
- `ValidationError` - Invalid input
- `AuthError` - Authentication failures
- `SessionExpiredError` - Session timeout

---

#### `SessionService.ts`

**Purpose**: Manage session lifecycle, timeouts, and activity tracking

**Key Methods**:
- `async createSession(userId: string): Promise<Session>` - Create new session
- `async getSession(sessionId: string): Promise<Session | null>` - Get session by ID
- `async updateActivity(sessionId: string): Promise<void>` - Update last activity time
- `isSessionExpired(session: Session): boolean` - Check if session expired
- `async invalidateSession(sessionId: string): Promise<void>` - Delete session
- `async getUserSessions(userId: string): Promise<Session[]>` - Get all active sessions for user
- `async invalidateAllUserSessions(userId: string): Promise<void>` - Invalidate all user sessions
- `startExpirationCheck(): void` - Start automatic session expiration checking
- `stopExpirationCheck(): void` - Stop expiration checking
- `async cleanupExpiredSessions(): Promise<number>` - Manually clean up expired sessions

**Constants**:
- `IDLE_TIMEOUT_MS = 30 * 60 * 1000` (30 minutes)
- `ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000` (8 hours)
- `CHECK_INTERVAL_MS = 30 * 1000` (30 seconds)

---

#### `TotpService.ts`

**Purpose**: Handle TOTP 2FA operations

**Key Methods**:
- `generateSecret(): string` - Generate new TOTP secret (base32)
- `async generateQRCode(secret: string, username: string, issuer?: string): Promise<string>` - Generate QR code data URL
- `validateToken(token: string, secret: string): boolean` - Validate 6-digit TOTP token
- `generateBackupCodes(): string[]` - Generate 10 backup codes
- `hashBackupCode(code: string): string` - Hash backup code for storage
- `validateBackupCode(code: string, hashedCode: string): boolean` - Validate backup code
- `areBackupCodesExhausted(user: User): boolean` - Check if all backup codes used

---

#### `SiteService.ts`

**Purpose**: CRUD operations for site entries

**Key Methods**:
- `async createSite(site: Omit<Site, 'id' | 'createdAt' | 'lastModified'>): Promise<Site>` - Create new site
- `async getSite(siteId: string): Promise<Site | null>` - Get site by ID
- `async getAllSites(): Promise<Site[]>` - Get all sites for current user
- `async updateSite(siteId: string, updates: Partial<Site>): Promise<Site>` - Update site
- `async deleteSite(siteId: string): Promise<void>` - Delete site
- `async searchSites(query: string): Promise<Site[]>` - Search/filter sites by name or URL
- `sortSites(sites: Site[], sortBy: 'name' | 'dateAdded' | 'dateModified', order: 'asc' | 'desc'): Site[]` - Sort sites
- `validateUrlOrIp(urlOrIp: string): {valid: boolean, type: 'url' | 'ip' | null, warning: string | null}` - Validate URL/IP format
- `async checkPasswordReuse(password: string): Promise<Site[]>` - Check for password reuse

---

#### `SecurityLogService.ts`

**Purpose**: Log and retrieve security events

**Key Methods**:
- `async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>` - Log security event
- `async getUserEvents(userId: string, limit?: number): Promise<SecurityEvent[]>` - Get events for user
- `async getEventsByType(userId: string, eventType: SecurityEventType, limit?: number): Promise<SecurityEvent[]>` - Get events by type
- `async clearUserEvents(userId: string): Promise<void>` - Clear all events for user

---

### New Components (`src/components/`)

1. **LoginForm.ts** - Username, password, optional 2FA code input
2. **RegisterForm.ts** - Username, password with strength indicator
3. **TotpSetupModal.ts** - QR code, backup codes, skip option
4. **SitesListView.ts** - Site list with search/filter/sort
5. **SiteDetailModal.ts** - Display site details, copy password
6. **SiteEditModal.ts** - Edit site fields
7. **SiteAssignModal.ts** - Assign generated password to site
8. **SettingsView.ts** - 2FA management, active sessions, account deletion
9. **DeleteAccountModal.ts** - Confirmation with "DELETE" typed + password

---

## Changes to Existing Classes

### `Database.ts` (major refactor)

**Current**: In-memory storage with localStorage, single flat array of credentials

**Changes**:
1. Add multi-user support with separate users, sessions collections
2. Implement encrypted per-user vaults
3. New methods: `saveUser`, `getUser`, `getUserByUsername`, `updateUser`, `deleteUser`, `saveSession`, `getSession`, `deleteSession`, `getUserSessions`, `saveVault`, `getVault`, `deleteVault`
4. Add migration method: `migrateToMultiUser()`

**Storage Keys**:
- `pwgen_users` → User[]
- `pwgen_sessions` → Session[]
- `pwgen_vault_${userId}` → EncryptedVault

---

### `HistoryService.ts`

**Changes**:
1. All methods now filter by current user ID
2. Work with decrypted vault data from CryptoService
3. Accept `userId` parameter in all methods

---

### `PasswordFormComponent.ts` and `PassphraseFormComponent.ts`

**Changes**:
1. Add "Assign to Site" button after generation
2. Save credentials to current user's vault
3. Trigger site assignment modal on generation success

---

### `AppComponent.ts` (main.ts)

**Changes**:
1. Add authentication gate (check session on load)
2. Route between login and main app views
3. Add session activity tracking
4. Handle logout and session expiration events
5. Add "Sites" and "Settings" navigation tabs

---

## Security Decisions

**Reference**: See [SECURITY.md](./SECURITY.md) for complete security implementation guide, OWASP/NIST compliance details, and security testing requirements.

### Password Hashing: Argon2id

**Decision**: Use Argon2id for password hashing (winner of 2015 Password Hashing Competition)

**Parameters**:
- Time (iterations): 3
- Memory: 64 MiB (65536 KiB)
- Parallelism: 1 (browser limitation)
- Hash length: 32 bytes (256 bits)

**Justification**:
- OWASP recommended algorithm for password storage
- Superior resistance to GPU/ASIC attacks compared to PBKDF2 or bcrypt
- Memory-hard function prevents parallel cracking
- Parameters exceed OWASP minimums (time: 2+, memory: 19 MiB+)
- Performance acceptable for user login: ~500-1200ms desktop, ~1200-2000ms mobile

**Alternatives Considered**:
- PBKDF2-SHA256: Not memory-hard, vulnerable to GPU attacks
- bcrypt: Less resistant to GPU attacks than Argon2
- scrypt: Good but Argon2 is newer and preferred by OWASP

### Key Derivation: PBKDF2

**Decision**: Use PBKDF2-SHA256 with 100,000 iterations for encryption key derivation

**Parameters**:
- Algorithm: PBKDF2 with HMAC-SHA-256
- Iterations: 100,000
- Salt: 32 bytes (256 bits), cryptographically random
- Output: 256-bit AES-GCM key

**Justification**:
- NIST SP 800-63B approved KDF
- Exceeds NIST minimum of 10,000 iterations (2023 guidance)
- Meets OWASP recommendation of 100,000+ iterations for PBKDF2
- Native browser support via Web Crypto API (no external dependency)
- Performance acceptable: ~500-1500ms desktop, ~1500-3000ms mobile
- Used only for key derivation, not password hashing (Argon2id for that)

**Why Not Argon2 for Keys?**:
- Argon2 not available in Web Crypto API (requires external library)
- PBKDF2 with 100K iterations provides sufficient protection for key derivation
- Keys are ephemeral (never stored), reducing attack surface

### Data Encryption: AES-256-GCM

**Decision**: Use AES-256-GCM for encrypting user data at rest

**Parameters**:
- Algorithm: AES-GCM (Galois/Counter Mode)
- Key length: 256 bits
- IV length: 96 bits (12 bytes)
- Tag length: 128 bits (16 bytes)

**Justification**:
- NIST approved authenticated encryption algorithm
- GCM mode provides both confidentiality (encryption) and integrity (authentication)
- Tamper detection: Any modification to ciphertext fails authentication
- Native browser support via Web Crypto API
- Industry standard for data encryption
- 256-bit keys provide future-proof security (quantum-resistant until large-scale quantum computers)

**Alternatives Considered**:
- AES-CBC: No built-in authentication, requires separate HMAC
- ChaCha20-Poly1305: Not available in Web Crypto API

### Password Requirements: NIST SP 800-63B Compliant

**Decision**: Minimum 8 characters, no composition rules

**Requirements**:
- Minimum length: 8 characters
- Maximum length: 256 characters (exceeds NIST minimum of 64)
- Allow all printable ASCII and Unicode characters
- No composition rules (no "must contain uppercase, number, special char")
- Screen against top 10,000 common passwords
- No periodic password change requirements

**Justification**:
- NIST SP 800-63B Section 5.1.1.1 compliance
- OWASP ASVS 4.0 Section 2.1.1 compliance
- Composition rules reduce entropy and frustrate users
- Length is more important than character diversity
- Common password screening prevents weak passwords

**Rejected Requirements**:
- ❌ "Must contain uppercase, lowercase, number, special character"
- ❌ "Must change password every 90 days"
- ❌ "Cannot reuse last 5 passwords"
- All rejected per NIST guidance as counterproductive

### Session Management

**Decision**: 30-minute idle timeout, 8-hour absolute timeout

**Parameters**:
- Idle timeout: 30 minutes of inactivity
- Absolute timeout: 8 hours from login
- Warning: 5 minutes before idle timeout
- Session ID: UUID v4 (cryptographically random)

**Justification**:
- OWASP ASVS 4.0 Section 3.2.2 compliance
- Balance between security and usability
- 30-minute idle prevents session hijacking from unattended devices
- 8-hour absolute prevents indefinite sessions
- Warning gives users chance to continue session

**Alternatives Considered**:
- 15-minute idle: Too aggressive, poor UX
- No absolute timeout: Security risk for long-running sessions
- Remember me: Rejected for security reasons (NIST guidance)

### Two-Factor Authentication: TOTP

**Decision**: Time-based One-Time Passwords (TOTP) per RFC 6238

**Parameters**:
- Algorithm: SHA-1 (maximum authenticator app compatibility)
- Digits: 6
- Period: 30 seconds
- Window: ±1 period (±30 seconds for clock skew)
- Secret: 160 bits (20 bytes)
- Backup codes: 10 codes, single-use, hashed (SHA-256)

**Justification**:
- OWASP ASVS 4.0 Section 2.8 compliance
- NIST SP 800-63B AAL2 (Authenticator Assurance Level 2)
- RFC 6238 standard protocol
- Compatible with all major authenticator apps (Google, Microsoft, Authy, etc.)
- SHA-1 acceptable for TOTP (not for signatures/certificates)
- Backup codes provide recovery option

**Alternatives Considered**:
- SMS OTP: Not available in browser-only application
- Hardware tokens (U2F/WebAuthn): Too complex for this scope
- Email OTP: Not available in offline-first application

### Security Logging

**Decision**: Comprehensive security event logging with privacy protection

**Logged Events**:
- All authentication events (login, logout, registration)
- Password changes
- 2FA setup/disable
- Session events (timeout, revocation)
- Account deletion

**Privacy Protection**:
- Never log passwords, tokens, secrets, or keys
- Redact email addresses (u***@example.com)
- Sanitize all metadata before storage
- Limit to 1000 events per user (auto-prune oldest)

**Justification**:
- OWASP ASVS 4.0 Section 7.2.1 compliance
- Provides audit trail for security incidents
- Helps users monitor account activity
- Privacy-preserving (no PII in logs)

### Rate Limiting & Account Lockout

**Decision**: Progressive rate limiting with temporary account lockout

**Parameters**:
- Failed login attempts: Max 5 before rate limiting activates
- Rate limiting delays: 1s, 2s, 4s, 8s, 16s (exponential backoff)
- Account lockout: 10 failed attempts in 15 minutes
- Lockout duration: 15 minutes

**Justification**:
- OWASP ASVS 4.0 protection against brute-force attacks
- Exponential backoff slows down automated attacks
- Temporary lockout prevents credential stuffing
- 15-minute cooldown balances security and UX

**Implementation Note**:
- Rate limiting state stored in memory (resets on page reload)
- Acceptable for client-side application with no server persistence
- Users can always clear browser data to reset (but this also clears their vault)

### No Server-Side Pepper

**Decision**: Do not implement password pepper

**Justification**:
- Client-side application with no server component
- No secure place to store pepper (would be visible in JavaScript)
- Argon2id with strong parameters provides sufficient protection
- Per-user encryption keys (derived from master password) provide similar benefit

**Note**: If this application were server-based, a pepper would be strongly recommended.

### Key Storage Policy

**Decision**: Never store encryption keys

**Policy**:
- Encryption keys are ALWAYS derived from user's master password on-demand
- Keys exist only in memory during active session
- Keys are marked non-extractable in Web Crypto API
- Keys are cleared from memory on logout/timeout

**Justification**:
- Keys derived from passwords can't be stolen from storage
- Compromised localStorage doesn't expose keys
- User's master password is the only secret needed
- Follows principle of least privilege

### Data Classification

**Encrypted at Rest** (using per-user keys):
- Site passwords
- Site URLs
- Site notes/descriptions
- 2FA secrets (TOTP base32 secrets)

**Not Encrypted** (already protected or not sensitive):
- Usernames (needed for login)
- Email addresses (needed for account recovery)
- Password hashes (already cryptographically protected by Argon2id)
- Session metadata (timestamps, user agents - not sensitive)
- Security logs (audit trail - no PII)
- 2FA backup codes (hashed with SHA-256, not encrypted)

**Justification**:
- Minimize performance overhead (only encrypt sensitive data)
- Balance between security and usability
- Non-sensitive data accessible without decryption key

---

## Data Model and Persistence Changes

### localStorage Structure

**Before** (Feature 001):
```
password-gen-credentials: GeneratedCredential[]
```

**After** (Feature 002):
```
pwgen_users: User[]
pwgen_sessions: Session[]
pwgen_vault_<userId>: EncryptedVault (per user)
```

### Migration Strategy

1. Check if `password-gen-credentials` exists
2. If yes and no users exist, prompt user:
   - "Migrate existing data to new account or start fresh?"
3. If migrate:
   - Prompt for username/password
   - Create user account
   - Encrypt and move credentials to user's vault
   - Delete old key
4. Backup before migration (export to JSON file)

### Encryption Flow

**On Login**:
1. Derive encryption key from master password
2. Retrieve encrypted vault from localStorage
3. Decrypt vault using key
4. Hold decrypted vault in memory

**On Data Update**:
1. Update in-memory VaultData
2. Encrypt vault
3. Save EncryptedVault to localStorage

**On Logout**:
1. Clear in-memory vault
2. Clear encryption key
3. Invalidate session

---

## Error Handling Strategy

### Crypto Errors
- Wrap Web Crypto API errors in `CryptoError`
- Show user: "Encryption failed. Please try again."
- Log full error stack

### Authentication Errors
- Generic message for invalid credentials: "Invalid username or password"
- Specific messages for account locked, weak password
- Rate limiting: Lock account after 5 failed attempts (15 minutes)

### Session Expiration
- Emit `session-expired` event
- Redirect to login
- Show: "Your session has expired. Please log in again."

### TOTP Errors
- Invalid code format: "Please enter a 6-digit code"
- Invalid code value: "Invalid code. Please try again."
- Lock account after 3 failed 2FA attempts (15 minutes)

### Site Validation Errors
- Invalid URL/IP: Inline error, allow saving with warning
- Missing fields: Highlight and disable submit
- Notes too long (>500 chars): Character counter

### Storage Quota Errors
- Catch `QuotaExceededError`
- Show: "Storage quota exceeded. Please delete old entries."
- Offer to export data

---

## Testing Strategy

### Unit Tests (Vitest)

**CryptoService**: Hashing, encryption/decryption, key derivation  
**AuthService**: Registration, login, logout, validation  
**SessionService**: Timeout detection, session management  
**TotpService**: Secret generation, token validation, backup codes  
**SiteService**: CRUD, search/filter, sorting  
**SecurityLogService**: Event logging, retrieval  

### Integration Tests

- Full registration → 2FA → login flow
- Session timeout scenarios
- Site assignment workflow
- Account deletion (verify data removed)
- Data isolation between users

### Accessibility Tests (@axe-core)

- All new forms and modals
- Focus management
- Screen reader compatibility

### Security Tests

- Encryption key isolation
- Session token validation
- 2FA lockout enforcement
- Password strength validation

**Target**: 80%+ code coverage for all new code

---

## Risks and Open Questions

### Risks

1. **Key Derivation Performance**: PBKDF2 (100K iterations) may take 1-3s on slow devices  
   *Mitigation*: Show loading spinner, consider 50K iterations if needed

2. **localStorage Size Limits**: 5-10MB varies by browser  
   *Mitigation*: Storage quota monitoring, enforce 50-password history limit

3. **Password Recovery**: No server-side recovery mechanism  
   *Mitigation*: Prominent warnings, recommend secure backup location

4. **2FA Device Loss**: Account inaccessible without backup codes  
   *Mitigation*: Clear warnings during setup, printable backup codes

5. **Browser Compatibility**: Web Crypto API required  
   *Mitigation*: Check API availability on load

6. **Concurrent Tabs**: Stale vault data in multiple tabs  
   *Mitigation*: Listen for `storage` event, reload vault when changed

7. **Bundle Size**: Crypto libraries increase bundle  
   *Mitigation*: Code-split auth pages, lazy-load crypto libs

### Open Questions

1. **Migration UX**: Force account creation or allow guest mode?  
   *Recommendation*: Require account but offer one-time export

2. **Session Persistence**: Remember me across browser restarts?  
   *Recommendation*: No for security

3. **Password Strength**: Block or warn on weak passwords?  
   *Recommendation*: Block during registration

4. **2FA Recovery**: How to recover from lost device + exhausted codes?  
   *Recommendation*: Out of scope, show "Contact support"

5. **Idle Timeout Warning**: Warn 5min before timeout?  
   *Recommendation*: Yes, implement notification with "Continue Session" button

6. **Password History Limit**: What happens at 50-password limit?  
   *Recommendation*: Auto-delete oldest (FIFO)

---

## Implementation Phases

### Phase 0: Research & Setup (1-2 days)
- Research argon2-browser vs Web Crypto for hashing
- Benchmark PBKDF2 100K iterations
- Prototype TOTP integration (otpauth)
- Prototype QR code generation (qrcode)
- Set up new test suites

### Phase 1: Core Crypto & Data Layer (3-4 days)
- Implement CryptoService
- Refactor Database for multi-user
- Implement EncryptedVault storage
- Unit tests for crypto and database

### Phase 2: Authentication Service (3-4 days)
- Implement AuthService
- Implement SessionService
- Implement SecurityLogService
- Unit and integration tests

### Phase 3: 2FA Implementation (2-3 days)
- Implement TotpService
- Integrate QR code generation
- Update AuthService for 2FA flow
- Unit and integration tests

### Phase 4: Authentication UI (3-4 days)
- Build Login, Register, TotpSetup components
- Update AppComponent for auth routing
- Implement session timeout UI
- Accessibility tests

### Phase 5: Site Management Service (2-3 days)
- Implement SiteService
- Update HistoryService for user scope
- Unit and integration tests

### Phase 6: Site Management UI (4-5 days)
- Build Sites List, Assign, Detail, Edit components
- Update generator forms for site assignment
- Accessibility tests

### Phase 7: Settings & Account Management (2-3 days)
- Build Settings and DeleteAccount components
- Implement 2FA enable/disable
- Active sessions management
- Integration tests

### Phase 8: Data Migration & Polish (2-3 days)
- Implement migration from old localStorage
- Build migration UI
- Storage quota monitoring
- Error boundaries
- Final accessibility audit

### Phase 9: Testing & Documentation (2-3 days)
- Full test suite execution
- Manual testing (all browsers, mobile)
- Update documentation
- Migration guide

**Total Estimated Time**: 24-35 days

---

## Definition of Done

- [ ] All 36 functional requirements implemented and tested
- [ ] All 6 user stories have passing acceptance tests
- [ ] All 8 edge cases handled
- [ ] All 10 success criteria met
- [ ] Unit test coverage ≥80%
- [ ] All accessibility tests pass (WCAG 2.1 AA)
- [ ] All security tests pass
- [ ] Manual testing on Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive testing (320px-2560px)
- [ ] No console errors in production
- [ ] Bundle size increase ≤200KB gzipped
- [ ] Documentation updated
- [ ] Spec and plan committed
- [ ] Changes merged to main
- [ ] Feature branch deleted

---

**Plan Status**: ✅ Complete - Ready for Implementation  
**Next Steps**: Begin Phase 0 (Research & Setup)
