# Implementation Tasks: User Authentication & Site Password Management

**Feature**: 002-user-auth-sites  
**Generated**: 2025-12-19  
**Status**: Not Started  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Task Groups Overview

1. **Setup & Research** (Phase 0) - 8 tasks
2. **Core Cryptography & Data Layer** (Phase 1) - 12 tasks
3. **Authentication Services** (Phase 2) - 14 tasks
4. **Two-Factor Authentication** (Phase 3) - 10 tasks
5. **Authentication UI** (Phase 4) - 13 tasks
6. **Site Management Services** (Phase 5) - 9 tasks
7. **Site Management UI** (Phase 6) - 15 tasks
8. **Settings & Account Management** (Phase 7) - 11 tasks
9. **Data Migration & Polish** (Phase 8) - 12 tasks
10. **Testing & Documentation** (Phase 9) - 10 tasks

**Total Tasks**: 114

---

## Phase 0: Setup & Research (1-2 days)

### Dependencies & Environment

- [x] **TASK-001**: Install cryptography dependencies ✅
  - Run `npm install argon2-browser otpauth qrcode @types/qrcode`
  - Verify installations in package.json
  - Update package-lock.json
  - **Completed**: argon2-browser@1.18.0, otpauth@9.4.1, qrcode@1.5.4, @types/qrcode@1.5.6

- [x] **TASK-002**: Set up test infrastructure for authentication ✅
  - Create `tests/services/auth/` directory
  - Create `tests/services/crypto/` directory
  - Create `tests/components/auth/` directory
  - Configure Vitest for new test directories
  - **Completed**: Created test directories with README documentation

### Performance & Compatibility Research

- [x] **TASK-003**: Benchmark PBKDF2 key derivation performance ✅
  - Create benchmark script for PBKDF2 with 100K iterations
  - Test on multiple devices (desktop, mobile simulators)
  - Document results: acceptable if <3 seconds
  - Consider fallback to 50K iterations if needed
  - **Completed**: Created interactive HTML benchmark tool at scripts/benchmark-pbkdf2.html

- [x] **TASK-004**: Verify Web Crypto API browser support ✅
  - Create feature detection utility for Web Crypto API
  - Test crypto.subtle.importKey, encrypt, decrypt
  - Document minimum browser versions
  - Create fallback error message for unsupported browsers
  - **Completed**: Created cryptoSupport.ts utility and check-crypto-support.html test page

### Library Prototyping

- [x] **TASK-005**: Prototype argon2-browser password hashing ✅
  - Create test script for Argon2id hashing
  - Test hash generation and verification
  - Measure performance (target: <2 seconds)
  - Document recommended parameters
  - **Completed**: Created test-argon2.html prototype, recommended params: 3 iterations, 64 MiB

- [x] **TASK-006**: Prototype TOTP integration with otpauth ✅
  - Create test script for secret generation
  - Test token generation and validation
  - Test time drift tolerance (±1 period)
  - Document integration approach
  - **Completed**: Created test-totp.html with live token generator, window=1 (±30s tolerance)

- [x] **TASK-007**: Prototype QR code generation with qrcode library ✅
  - Generate sample QR code for TOTP URI
  - Test QR code data URL generation
  - Test different sizes for mobile scanning
  - Document optimal size and format
  - **Completed**: Created test-qrcode.html with size comparison, 256x256 recommended, Medium (M) error correction

- [x] **TASK-008**: Review and document security best practices ✅
  - Review OWASP guidelines for password storage
  - Review NIST guidelines for key derivation
  - Document security decisions in plan.md
  - Create security checklist for implementation
  - **Completed**: Created SECURITY.md with comprehensive OWASP/NIST guidelines, updated plan.md with security decisions section

---

## Phase 1: Core Cryptography & Data Layer (3-4 days)

### CryptoService Implementation

- [x] **TASK-009**: Create CryptoService class structure ✅
  - Create `src/services/CryptoService.ts`
  - Define class with constants (PBKDF2_ITERATIONS, SALT_LENGTH, KEY_LENGTH)
  - Add CryptoError class
  - Add JSDoc documentation
  - **Completed**: Created CryptoService with constants, CryptoError class, type definitions, method stubs

- [x] **TASK-010**: Implement password hashing methods ✅
  - Implement `hashPassword(password: string): Promise<string>`
  - Implement `verifyPassword(password: string, hash: string): Promise<boolean>`
  - Use argon2-browser with Argon2id
  - Add error handling
  - **Completed**: Implemented hashPassword and verifyPassword with Argon2id, input validation, error handling

- [x] **TASK-011**: Implement key derivation method ✅
  - Implement `deriveEncryptionKey(masterPassword: string, salt: string): Promise<CryptoKey>`
  - Use PBKDF2 with 100,000 iterations
  - Use SHA-256 as hash function
  - Return CryptoKey suitable for AES-GCM
  - **Completed**: Implemented deriveEncryptionKey with PBKDF2-SHA256, 100K iterations, non-extractable keys

- [X] **TASK-012**: Implement data encryption methods
  - Implement `encryptData(data: any, key: CryptoKey): Promise<{encrypted: string, iv: string, salt: string}>`
  - Use AES-GCM via Web Crypto API
  - JSON stringify data before encryption
  - Base64 encode encrypted output
  - **Completed**: Implemented encryptData with AES-256-GCM, unique IV generation, comprehensive validation and error handling

- [X] **TASK-013**: Implement data decryption methods
  - Implement `decryptData(encrypted: string, iv: string, key: CryptoKey): Promise<any>`
  - Base64 decode encrypted input
  - Use AES-GCM for decryption
  - JSON parse decrypted data
  - **Completed**: Implemented decryptData with AES-256-GCM, tamper detection, comprehensive validation and error handling

- [X] **TASK-014**: Implement utility methods
  - Implement `generateSalt(): string` (16 bytes, base64)
  - Implement `generateToken(): string` (32 bytes, base64)
  - Implement `generateUUID(): string` (UUID v4)
  - Use crypto.getRandomValues for all random generation
  - **Completed**: Implemented generateToken (32 bytes base64), generateUUID (RFC 4122 v4), validatePasswordStrength (OWASP/NIST compliant), common password detection

### CryptoService Testing

- [X] **TASK-015**: Write unit tests for password hashing
  - Test hashPassword generates valid Argon2id hash
  - Test verifyPassword with correct password returns true
  - Test verifyPassword with wrong password returns false
  - Test error handling for invalid inputs
  - **Completed**: Comprehensive test suite created in CryptoService.hash.test.ts (24 tests) during TASK-010 implementation

- [X] **TASK-016**: Write unit tests for encryption/decryption
  - Test encryptData → decryptData round-trip
  - Test same data + key produces different ciphertext (different IV)
  - Test decryption with wrong key fails
  - Test encryption of various data types (string, object, array)
  - **Completed**: Comprehensive test suites created in CryptoService.encryption.test.ts (59 tests) and CryptoService.decryption.test.ts (68 tests) during TASK-012 and TASK-013 implementation

- [X] **TASK-017**: Write unit tests for key derivation
  - Test same password + salt produces same key
  - Test different salts produce different keys
  - Test key derivation performance (<3 seconds)
  - Test error handling
  - **Completed**: Comprehensive test suite created in CryptoService.keyderivation.test.ts (27 tests) during TASK-011 implementation

### Database Refactoring

- [X] **TASK-018**: Refactor Database class for multi-user support
  - Add storage keys: `pwgen_users`, `pwgen_sessions`, `pwgen_vault_${userId}`
  - Remove old `credentials` array
  - Add `users: User[]` and `sessions: Session[]` properties
  - Update `initialize()` method
  - **Completed**: Refactored Database class with multi-user support, created User/Session/Site/SecurityEvent models, implemented vault storage methods, maintained backwards compatibility with legacy storage

- [ ] **TASK-019**: Implement user CRUD methods in Database
  - Implement `saveUser(user: User): Promise<User>`
  - Implement `getUser(userId: string): Promise<User | null>`
  - Implement `getUserByUsername(username: string): Promise<User | null>`
  - Implement `getAllUsers(): Promise<User[]>`
  - Implement `updateUser(userId: string, updates: Partial<User>): Promise<User>`
  - Implement `deleteUser(userId: string): Promise<void>`

- [ ] **TASK-020**: Implement session methods in Database
  - Implement `saveSession(session: Session): Promise<Session>`
  - Implement `getSession(sessionId: string): Promise<Session | null>`
  - Implement `deleteSession(sessionId: string): Promise<void>`
  - Implement `getUserSessions(userId: string): Promise<Session[]>`
  - Implement `deleteAllUserSessions(userId: string): Promise<void>`

- [ ] **TASK-021**: Implement encrypted vault methods in Database
  - Implement `saveVault(vault: EncryptedVault): Promise<void>`
  - Implement `getVault(userId: string): Promise<EncryptedVault | null>`
  - Implement `deleteVault(userId: string): Promise<void>`
  - Use storage key pattern: `pwgen_vault_${userId}`

---

## Phase 2: Authentication Services (3-4 days)

### Models Creation

- [ ] **TASK-022**: Create User model
  - Create `src/models/User.ts`
  - Define User interface with all fields
  - Add type exports
  - Add JSDoc documentation

- [ ] **TASK-023**: Create Session model
  - Create `src/models/Session.ts`
  - Define Session interface
  - Add helper methods if needed
  - Add JSDoc documentation

- [ ] **TASK-024**: Create SecurityEvent model
  - Create `src/models/SecurityEvent.ts`
  - Define SecurityEventType union type
  - Define SecurityEvent interface
  - Add JSDoc documentation

- [ ] **TASK-025**: Create EncryptedVault model
  - Create `src/models/EncryptedVault.ts`
  - Define EncryptedVault interface
  - Define VaultData interface
  - Add JSDoc documentation

### SessionService Implementation

- [ ] **TASK-026**: Create SessionService class
  - Create `src/services/SessionService.ts`
  - Define class with timeout constants
  - Add constructor accepting Database dependency
  - Add JSDoc documentation

- [ ] **TASK-027**: Implement session lifecycle methods
  - Implement `createSession(userId: string): Promise<Session>`
  - Implement `getSession(sessionId: string): Promise<Session | null>`
  - Implement `updateActivity(sessionId: string): Promise<void>`
  - Implement `invalidateSession(sessionId: string): Promise<void>`

- [ ] **TASK-028**: Implement session timeout logic
  - Implement `isSessionExpired(session: Session): boolean`
  - Check idle timeout (30 minutes)
  - Check absolute timeout (8 hours)
  - Return true if either expired

- [ ] **TASK-029**: Implement automatic session cleanup
  - Implement `startExpirationCheck(): void`
  - Use setInterval with 30-second interval
  - Implement `stopExpirationCheck(): void`
  - Implement `cleanupExpiredSessions(): Promise<number>`

- [ ] **TASK-030**: Implement multi-session management
  - Implement `getUserSessions(userId: string): Promise<Session[]>`
  - Implement `invalidateAllUserSessions(userId: string): Promise<void>`
  - Add session count limits if needed

### SecurityLogService Implementation

- [ ] **TASK-031**: Create SecurityLogService class
  - Create `src/services/SecurityLogService.ts`
  - Add constructor accepting Database dependency
  - Add JSDoc documentation

- [ ] **TASK-032**: Implement security logging methods
  - Implement `logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void>`
  - Implement `getUserEvents(userId: string, limit?: number): Promise<SecurityEvent[]>`
  - Implement `getEventsByType(userId: string, eventType: SecurityEventType, limit?: number): Promise<SecurityEvent[]>`
  - Implement `clearUserEvents(userId: string): Promise<void>`
  - Store events in user's encrypted vault

### AuthService Implementation

- [ ] **TASK-033**: Create AuthService class
  - Create `src/services/AuthService.ts`
  - Add dependencies: CryptoService, SessionService, SecurityLogService, Database
  - Add current user/session state
  - Add custom error classes (ValidationError, AuthError, SessionExpiredError)

- [ ] **TASK-034**: Implement user registration
  - Implement `register(username: string, password: string): Promise<User>`
  - Validate username availability
  - Validate password strength
  - Hash password with Argon2id
  - Generate salt for key derivation
  - Save user to database
  - Log registration event

- [ ] **TASK-035**: Implement user login
  - Implement `login(username: string, password: string, totpCode?: string): Promise<Session>`
  - Retrieve user by username
  - Verify password hash
  - Check if 2FA enabled and code required
  - Validate 2FA code if provided
  - Handle failed login attempts and account lockout
  - Create session on success
  - Log login event

- [ ] **TASK-036**: Implement authentication helpers
  - Implement `logout(sessionId: string): Promise<void>`
  - Implement `getCurrentUser(): User | null`
  - Implement `getCurrentSession(): Session | null`
  - Implement `isAuthenticated(): boolean`
  - Implement `validatePasswordStrength(password: string): {valid: boolean, errors: string[]}`
  - Implement `isUsernameAvailable(username: string): Promise<boolean>`

- [ ] **TASK-037**: Implement account deletion
  - Implement `deleteAccount(userId: string, password: string): Promise<void>`
  - Verify password before deletion
  - Delete user from database
  - Delete user's encrypted vault
  - Invalidate all user sessions
  - Clear security events
  - Log deletion event (before clearing)

### Authentication Services Testing

- [ ] **TASK-038**: Write unit tests for SessionService
  - Test session creation with correct timeouts
  - Test updateActivity resets idle timeout
  - Test isSessionExpired detects idle timeout
  - Test isSessionExpired detects absolute timeout
  - Test cleanupExpiredSessions removes expired
  - Test getUserSessions returns only user's sessions

- [ ] **TASK-039**: Write unit tests for AuthService registration
  - Test successful registration creates user
  - Test duplicate username rejected
  - Test weak password rejected
  - Test password hashed correctly
  - Test registration event logged

- [ ] **TASK-040**: Write unit tests for AuthService login
  - Test successful login creates session
  - Test invalid credentials rejected
  - Test account lockout after 5 failed attempts
  - Test locked account rejected for 15 minutes
  - Test lockout expires after timeout

- [ ] **TASK-041**: Write unit tests for AuthService account deletion
  - Test deleteAccount removes user
  - Test vault deleted
  - Test sessions invalidated
  - Test wrong password rejected

---

## Phase 3: Two-Factor Authentication (2-3 days)

### TotpService Implementation

- [ ] **TASK-042**: Create TotpService class
  - Create `src/services/TotpService.ts`
  - Add dependencies: otpauth, qrcode libraries
  - Define constants (backup code count, length)
  - Add JSDoc documentation

- [ ] **TASK-043**: Implement TOTP secret generation
  - Implement `generateSecret(): string`
  - Use otpauth.Secret.generate()
  - Return base32-encoded secret
  - Ensure cryptographically secure randomness

- [ ] **TASK-044**: Implement QR code generation
  - Implement `generateQRCode(secret: string, username: string, issuer?: string): Promise<string>`
  - Create TOTP URI using otpauth library
  - Generate QR code data URL using qrcode library
  - Set appropriate size for mobile scanning
  - Add error handling

- [ ] **TASK-045**: Implement TOTP token validation
  - Implement `validateToken(token: string, secret: string): boolean`
  - Use otpauth.TOTP.validate()
  - Allow time drift (±1 period, 30 seconds)
  - Validate token format (6 digits)
  - Return boolean

- [ ] **TASK-046**: Implement backup codes
  - Implement `generateBackupCodes(): string[]`
  - Generate 10 random 8-character alphanumeric codes
  - Use crypto.getRandomValues for randomness
  - Implement `hashBackupCode(code: string): string`
  - Implement `validateBackupCode(code: string, hashedCode: string): boolean`
  - Implement `areBackupCodesExhausted(user: User): boolean`

### 2FA Integration with AuthService

- [ ] **TASK-047**: Update User model for 2FA fields
  - Verify totpSecret, backupCodes, backupCodesUsed fields exist
  - Add 2FA-related helper methods if needed

- [ ] **TASK-048**: Update AuthService for 2FA registration flow
  - Add `enable2FA(userId: string): Promise<{secret: string, qrCode: string, backupCodes: string[]}>`
  - Generate TOTP secret
  - Generate QR code
  - Generate backup codes
  - Store hashed backup codes with user
  - Log 2FA enabled event

- [ ] **TASK-049**: Update AuthService login for 2FA
  - Modify `login()` to check if user has 2FA enabled
  - Throw AuthError with '2FA_REQUIRED' code if no totpCode provided
  - Validate TOTP token if provided
  - Validate backup code as fallback
  - Mark backup code as used if validated
  - Increment failed attempts on invalid 2FA code
  - Lock account after 3 failed 2FA attempts

- [ ] **TASK-050**: Add 2FA management methods to AuthService
  - Implement `disable2FA(userId: string, password: string): Promise<void>`
  - Require password confirmation
  - Clear TOTP secret and backup codes
  - Log 2FA disabled event
  - Implement `regenerateBackupCodes(userId: string): Promise<string[]>`

### TotpService Testing

- [ ] **TASK-051**: Write unit tests for TotpService
  - Test generateSecret returns valid base32 secret
  - Test validateToken accepts valid token
  - Test validateToken rejects invalid token
  - Test validateToken allows time drift
  - Test generateBackupCodes returns 10 unique codes
  - Test hashBackupCode → validateBackupCode round-trip
  - Test areBackupCodesExhausted detects when all used

- [ ] **TASK-052**: Write integration tests for 2FA flow
  - Test full 2FA setup: register → enable2FA → get QR/codes
  - Test login with 2FA: login requires code
  - Test login with valid TOTP code succeeds
  - Test login with invalid TOTP code fails
  - Test login with backup code succeeds and marks code used
  - Test account lockout after 3 failed 2FA attempts

---

## Phase 4: Authentication UI (3-4 days)

### Login Form Component

- [ ] **TASK-053**: Create LoginForm component structure
  - Create `src/components/LoginForm.ts`
  - Add HTML template with form structure
  - Add proper labels and ARIA attributes
  - Add error display container

- [ ] **TASK-054**: Implement LoginForm logic
  - Add username and password input handlers
  - Add 2FA code input (show/hide based on 2FA requirement)
  - Implement form validation
  - Implement form submission
  - Call AuthService.login()
  - Handle AuthError codes (invalid credentials, 2FA required, account locked)
  - Display appropriate error messages

- [ ] **TASK-055**: Style LoginForm component
  - Create `src/styles/auth.css`
  - Style form layout (mobile-first)
  - Style input fields and buttons
  - Style error messages
  - Ensure WCAG 2.1 AA color contrast

### Register Form Component

- [ ] **TASK-056**: Create RegisterForm component structure
  - Create `src/components/RegisterForm.ts`
  - Add HTML template with form structure
  - Add username, password, confirm password inputs
  - Add password strength indicator
  - Add proper labels and ARIA attributes

- [ ] **TASK-057**: Implement RegisterForm logic
  - Implement username availability check (debounced)
  - Implement password strength validation (live feedback)
  - Implement confirm password matching
  - Implement form submission
  - Call AuthService.register()
  - Handle ValidationError (username taken, weak password)
  - Redirect to 2FA setup modal on success

- [ ] **TASK-058**: Implement password strength indicator
  - Create visual indicator (progress bar or checklist)
  - Show requirements: 12+ chars, uppercase, lowercase, number, special char
  - Update in real-time as user types
  - Use semantic colors (red → yellow → green)
  - Ensure accessibility (don't rely on color alone)

### TOTP Setup Modal Component

- [ ] **TASK-059**: Create TotpSetupModal component structure
  - Create `src/components/TotpSetupModal.ts`
  - Add modal overlay and dialog
  - Add QR code display area
  - Add manual entry fallback (show secret as text)
  - Add 6-digit code input for verification
  - Add backup codes display
  - Add "Skip (Not Recommended)" and "Enable 2FA" buttons

- [ ] **TASK-060**: Implement TotpSetupModal logic
  - Call AuthService.enable2FA() on mount
  - Display QR code image from data URL
  - Display manual entry secret
  - Validate 6-digit verification code
  - Display backup codes after successful verification
  - Add "Copy All" and "Print" buttons for backup codes
  - Handle skip action with warning
  - Close modal and proceed to main app

- [ ] **TASK-061**: Style TotpSetupModal component
  - Style modal overlay (semi-transparent)
  - Style modal dialog (centered, responsive)
  - Style QR code container
  - Style backup codes grid
  - Add print-specific styles for backup codes
  - Ensure focus trap and keyboard navigation

### Auth Routing in AppComponent

- [ ] **TASK-062**: Update AppComponent for auth routing
  - Add authentication state tracking
  - Check AuthService.isAuthenticated() on app load
  - Show LoginForm if not authenticated
  - Show main app if authenticated
  - Listen for login/logout/session-expired events
  - Redirect to login on session expiration

- [ ] **TASK-063**: Implement session activity tracking
  - Listen for user interactions (mouse, keyboard, touch)
  - Call SessionService.updateActivity() on interaction
  - Throttle activity updates (max once per minute)
  - Add idle warning notification (optional, 5min before timeout)

- [ ] **TASK-064**: Add navigation for authenticated app
  - Update tab navigation: Generator, Sites, Settings
  - Add logout button to header
  - Handle logout action
  - Update active tab highlighting

### Accessibility Testing for Auth UI

- [ ] **TASK-065**: Write accessibility tests for auth forms
  - Test LoginForm: labels, focus order, error announcements
  - Test RegisterForm: password strength announced, validation errors
  - Test TotpSetupModal: QR alt text, focus trap, keyboard navigation
  - Run @axe-core tests on all auth components
  - Ensure no violations

- [ ] **TASK-066**: Write integration tests for auth UI flow
  - Test full registration flow: fill form → submit → 2FA modal → enable → login
  - Test login flow: enter credentials → (2FA code) → dashboard
  - Test session timeout: wait idle → redirected to login
  - Test logout: click logout → redirected to login

---

## Phase 5: Site Management Services (2-3 days)

### Site Model

- [ ] **TASK-067**: Create Site model
  - Create `src/models/Site.ts`
  - Define Site interface with all fields
  - Add type exports
  - Add JSDoc documentation

### SiteService Implementation

- [ ] **TASK-068**: Create SiteService class
  - Create `src/services/SiteService.ts`
  - Add dependencies: CryptoService, AuthService, Database
  - Add JSDoc documentation

- [ ] **TASK-069**: Implement site CRUD operations
  - Implement `createSite(site: Omit<Site, 'id' | 'createdAt' | 'lastModified'>): Promise<Site>`
  - Implement `getSite(siteId: string): Promise<Site | null>`
  - Implement `getAllSites(): Promise<Site[]>`
  - Implement `updateSite(siteId: string, updates: Partial<Site>): Promise<Site>`
  - Implement `deleteSite(siteId: string): Promise<void>`
  - Ensure all operations scoped to current user
  - Encrypt password field before storage

- [ ] **TASK-070**: Implement site search and filtering
  - Implement `searchSites(query: string): Promise<Site[]>`
  - Search by site name (case-insensitive)
  - Search by URL (case-insensitive)
  - Return matching sites only for current user

- [ ] **TASK-071**: Implement site sorting
  - Implement `sortSites(sites: Site[], sortBy: 'name' | 'dateAdded' | 'dateModified', order: 'asc' | 'desc'): Site[]`
  - Sort by site name (alphabetical)
  - Sort by createdAt timestamp
  - Sort by lastModified timestamp
  - Return sorted array

- [ ] **TASK-072**: Implement URL/IP validation
  - Implement `validateUrlOrIp(urlOrIp: string): {valid: boolean, type: 'url' | 'ip' | null, warning: string | null}`
  - Validate URL format (basic regex)
  - Validate IPv4 format
  - Validate IPv6 format
  - Return validation result with type

- [ ] **TASK-073**: Implement password reuse checking
  - Implement `checkPasswordReuse(password: string): Promise<Site[]>`
  - Decrypt all site passwords for current user
  - Compare with provided password
  - Return array of sites using same password

### HistoryService Updates

- [ ] **TASK-074**: Update HistoryService for user-scoped queries
  - Modify all methods to accept userId parameter
  - Filter results by userId
  - Update method signatures
  - Update existing components to pass userId

### SiteService Testing

- [ ] **TASK-075**: Write unit tests for SiteService
  - Test createSite saves to current user's vault
  - Test getSite retrieves site by ID
  - Test getSite throws error if site belongs to different user
  - Test updateSite updates fields and lastModified
  - Test deleteSite removes site
  - Test searchSites filters by name and URL
  - Test sortSites sorts correctly
  - Test validateUrlOrIp accepts valid URLs and IPs
  - Test validateUrlOrIp rejects invalid formats
  - Test checkPasswordReuse finds matching passwords

---

## Phase 6: Site Management UI (4-5 days)

### SitesListView Component

- [ ] **TASK-076**: Create SitesListView component structure
  - Create `src/components/SitesListView.ts`
  - Add search input
  - Add sort dropdown
  - Add site list container
  - Add empty state message

- [ ] **TASK-077**: Implement SitesListView logic
  - Load all sites from SiteService on mount
  - Implement search functionality (debounced)
  - Implement sort dropdown handler
  - Display sites as cards (mobile) or table rows (desktop)
  - Show masked passwords by default (••••••••)
  - Add "eye" icon to reveal password temporarily (10 seconds)
  - Add "Copy Password" button with confirmation
  - Add "Edit" button to open SiteEditModal
  - Handle empty state

- [ ] **TASK-078**: Style SitesListView component
  - Create `src/styles/sites.css`
  - Style search and sort controls
  - Style site cards (mobile)
  - Style site table (desktop)
  - Style password reveal/hide
  - Style copy confirmation animation
  - Ensure responsive layout

### SiteAssignModal Component

- [ ] **TASK-079**: Create SiteAssignModal component structure
  - Create `src/components/SiteAssignModal.ts`
  - Add modal overlay and dialog
  - Add form with fields: Site Name, URL/IP, Username, Notes
  - Add pre-filled password (read-only)
  - Add "Assign" and "Skip" buttons

- [ ] **TASK-080**: Implement SiteAssignModal logic
  - Receive generated password as prop
  - Implement form validation
  - Validate URL/IP format (show inline error)
  - Check password reuse and show warning
  - Call SiteService.createSite() on submit
  - Handle 5-minute inactivity timeout
  - Close modal on success or skip
  - Show success message

- [ ] **TASK-081**: Integrate SiteAssignModal with generator forms
  - Update PasswordFormComponent to show "Assign to Site" button after generation
  - Update PassphraseFormComponent to show "Assign to Site" button
  - Open SiteAssignModal with generated password
  - Update password history to show assignment status

### SiteDetailModal Component

- [ ] **TASK-082**: Create SiteDetailModal component structure
  - Create `src/components/SiteDetailModal.ts`
  - Add modal overlay and dialog
  - Display all site fields (read-only)
  - Add "Edit", "Delete", "Copy Password", "Regenerate Password" buttons

- [ ] **TASK-083**: Implement SiteDetailModal logic
  - Receive siteId as prop
  - Load site from SiteService
  - Display site details
  - Handle "Copy Password" with clipboard API
  - Handle "Edit" button → open SiteEditModal
  - Handle "Delete" button → show confirmation → delete site
  - Handle "Regenerate Password" → open generator → update site

### SiteEditModal Component

- [ ] **TASK-084**: Create SiteEditModal component structure
  - Create `src/components/SiteEditModal.ts`
  - Add modal overlay and dialog
  - Add editable form with all site fields
  - Add "Save" and "Cancel" buttons

- [ ] **TASK-085**: Implement SiteEditModal logic
  - Receive siteId as prop
  - Load site from SiteService
  - Pre-fill form with current values
  - Track form changes (dirty state)
  - Validate form on change
  - Call SiteService.updateSite() on save
  - Show "Discard changes?" confirmation on cancel if dirty
  - Close modal on success

- [ ] **TASK-086**: Add password regeneration to SiteEditModal
  - Add "Generate New Password" button
  - Open password generator inline or in modal
  - Update password field with new value
  - Mark form as dirty

### Password Reveal and Clipboard

- [ ] **TASK-087**: Implement password reveal functionality
  - Add toggle to show/hide password
  - Auto-hide after 10 seconds
  - Add timer display (countdown)
  - Handle multiple passwords revealed simultaneously

- [ ] **TASK-088**: Implement clipboard copy functionality
  - Use Clipboard API (navigator.clipboard.writeText)
  - Show "Copied!" confirmation for 2 seconds
  - Handle clipboard API unavailable (show manual copy fallback)
  - Auto-select text for manual copying

### Accessibility and Testing

- [ ] **TASK-089**: Write accessibility tests for site management UI
  - Test SitesListView: search input, sort dropdown, keyboard navigation
  - Test modals: focus trap, Escape key to close
  - Test password reveal: screen reader announcements
  - Test copy button: success announcement
  - Run @axe-core tests

- [ ] **TASK-090**: Write integration tests for site management flow
  - Test create site: generate password → assign → verify in list
  - Test edit site: open → modify → save → verify changes
  - Test delete site: open → delete → confirm → verify removed
  - Test search: type query → verify filtered results
  - Test sort: change sort order → verify reordered list

---

## Phase 7: Settings & Account Management (2-3 days)

### SettingsView Component

- [ ] **TASK-091**: Create SettingsView component structure
  - Create `src/components/SettingsView.ts`
  - Add sections: 2FA, Active Sessions, Account
  - Add appropriate headings and ARIA landmarks

- [ ] **TASK-092**: Implement 2FA management section
  - Display 2FA status (Enabled/Disabled)
  - Add "Enable 2FA" button (if disabled) → opens TotpSetupModal
  - Add "Disable 2FA" button (if enabled) → requires password confirmation
  - Add "View Backup Codes" button (if enabled) → shows remaining codes
  - Add "Regenerate Backup Codes" button → requires password, shows new codes

- [ ] **TASK-093**: Implement active sessions section
  - Load active sessions from SessionService
  - Display list of sessions with device info and last activity
  - Highlight current session
  - Add "Revoke" button for each session
  - Implement session revocation
  - Refresh list after revocation

- [ ] **TASK-094**: Implement account section
  - Display username and account creation date
  - Add "Delete Account" button → opens DeleteAccountModal
  - Style with appropriate warning colors

- [ ] **TASK-095**: Style SettingsView component
  - Create `src/styles/settings.css`
  - Style sections with clear separation
  - Style session list
  - Style buttons with appropriate colors (danger for delete)
  - Ensure responsive layout

### DeleteAccountModal Component

- [ ] **TASK-096**: Create DeleteAccountModal component structure
  - Create `src/components/DeleteAccountModal.ts`
  - Add modal overlay and dialog
  - Add warning text
  - Add text input for "DELETE" confirmation
  - Add password confirmation input
  - Add "Confirm Deletion" and "Cancel" buttons

- [ ] **TASK-097**: Implement DeleteAccountModal logic
  - Validate "DELETE" text typed exactly
  - Validate password confirmation
  - Disable "Confirm Deletion" button until both valid
  - Call AuthService.deleteAccount() on confirm
  - Show loading state during deletion
  - Redirect to login page on success
  - Show success message: "Account deleted successfully"

### Password Confirmation Dialog

- [ ] **TASK-098**: Create reusable PasswordConfirmationDialog component
  - Create `src/components/PasswordConfirmationDialog.ts`
  - Add modal with password input
  - Add "Confirm" and "Cancel" buttons
  - Return promise that resolves with password or rejects on cancel

- [ ] **TASK-099**: Use PasswordConfirmationDialog for sensitive actions
  - Use for 2FA disable
  - Use for backup code regeneration
  - Use for account deletion (in addition to "DELETE" text)

### Testing

- [ ] **TASK-100**: Write tests for settings and account management
  - Test 2FA enable/disable flow
  - Test backup code viewing and regeneration
  - Test session revocation
  - Test account deletion with wrong password (rejected)
  - Test account deletion with correct password (success)
  - Test account deletion data cleanup (user, vault, sessions removed)

---

## Phase 8: Data Migration & Polish (2-3 days)

### Data Migration

- [ ] **TASK-101**: Create migration utility
  - Create `src/services/MigrationService.ts`
  - Implement `checkForOldData(): boolean` (check for `password-gen-credentials` key)
  - Implement `exportOldData(): string` (JSON export)
  - Implement `migrateToNewUser(username: string, password: string): Promise<void>`
  - Encrypt old credentials and move to new user's vault

- [ ] **TASK-102**: Create migration UI
  - Create `src/components/MigrationModal.ts`
  - Show modal on first load if old data detected
  - Offer options: "Migrate to Account" or "Start Fresh"
  - For migrate: prompt for new username/password
  - For start fresh: offer to export data first
  - Show progress/loading during migration

- [ ] **TASK-103**: Test migration thoroughly
  - Create mock old data
  - Test migration to new account
  - Verify all credentials transferred
  - Verify old data deleted after migration
  - Test export before start fresh

### Storage Quota Monitoring

- [ ] **TASK-104**: Implement storage quota monitoring
  - Create utility to estimate localStorage usage
  - Check quota on data save operations
  - Warn user at 80% capacity
  - Prevent new entries at 95% capacity
  - Show helpful message with size breakdown

- [ ] **TASK-105**: Add data export feature (optional)
  - Implement export vault to JSON
  - Include sites and password history
  - Encrypt export with user password
  - Offer download as file

### Error Boundaries

- [ ] **TASK-106**: Implement global error boundary
  - Create `src/components/ErrorBoundary.ts`
  - Catch unhandled errors
  - Display user-friendly error message
  - Offer "Reload" or "Logout" options
  - Log errors to console (dev) or external service (prod)

- [ ] **TASK-107**: Add error handling for common scenarios
  - Handle crypto operations failing
  - Handle localStorage quota exceeded
  - Handle network errors (if any future API calls)
  - Handle session expiration gracefully
  - Show appropriate user messages

### Performance Optimization

- [ ] **TASK-108**: Optimize bundle size
  - Analyze bundle with Vite build analyzer
  - Code-split authentication pages
  - Lazy-load crypto libraries
  - Ensure total bundle increase <200KB gzipped

- [ ] **TASK-109**: Add loading states
  - Add loading spinner for login (key derivation)
  - Add loading spinner for registration (password hashing)
  - Add loading spinner for vault decryption
  - Add loading spinner for 2FA QR code generation
  - Add skeleton loaders for site list

### UI Polish

- [ ] **TASK-110**: Final UI/UX polish
  - Review all animations and transitions
  - Ensure consistent spacing and typography
  - Add appropriate icons throughout
  - Add empty states for all lists
  - Add loading states everywhere
  - Test on various screen sizes

- [ ] **TASK-111**: Implement keyboard shortcuts (optional)
  - Ctrl/Cmd+K for search
  - Escape to close modals
  - Tab navigation optimization
  - Document shortcuts in UI

---

## Phase 9: Testing & Documentation (2-3 days)

### Comprehensive Testing

- [ ] **TASK-112**: Run full test suite
  - Run all unit tests: `npm run test`
  - Run coverage report: `npm run test:coverage`
  - Verify 80%+ coverage for new code
  - Fix any failing tests

- [ ] **TASK-113**: Run accessibility audit
  - Run @axe-core tests: `npm run test:a11y`
  - Fix any accessibility violations
  - Manual testing with screen reader
  - Test keyboard-only navigation

- [ ] **TASK-114**: Run security tests
  - Test encryption key isolation between users
  - Test session token validation
  - Test 2FA lockout enforcement
  - Test password strength validation
  - Attempt to access other user's data

- [ ] **TASK-115**: Manual testing - browsers
  - Test on Chrome (latest)
  - Test on Firefox (latest)
  - Test on Safari (latest)
  - Test on Edge (latest)
  - Document any browser-specific issues

- [ ] **TASK-116**: Manual testing - devices
  - Test on desktop (1920x1080, 1366x768)
  - Test on tablet (iPad, 768x1024)
  - Test on mobile (iPhone, 375x667)
  - Test on large mobile (414x896)
  - Test on small mobile (320x568)
  - Verify no horizontal scrolling

- [ ] **TASK-117**: Performance testing
  - Measure login time (including key derivation)
  - Measure vault decryption time
  - Measure site list search time (with 100 sites)
  - Measure 2FA QR code generation time
  - Verify all meet performance goals

### Documentation

- [ ] **TASK-118**: Update README.md
  - Document new authentication features
  - Add setup instructions for new dependencies
  - Document security model
  - Add screenshots of new UI
  - Document known limitations

- [ ] **TASK-119**: Create migration guide
  - Create `MIGRATION.md` for existing users
  - Document migration process
  - Provide troubleshooting steps
  - Include data export instructions

- [ ] **TASK-120**: Document security model
  - Create `SECURITY.md`
  - Document encryption approach
  - Document password hashing
  - Document session management
  - Document 2FA implementation
  - Add security best practices for users

- [ ] **TASK-121**: Create user guide
  - Document registration process
  - Document 2FA setup
  - Document password assignment workflow
  - Document site management features
  - Document account deletion process

### Final Verification

- [ ] **TASK-122**: Verify all functional requirements
  - Review all 36 FRs from spec.md
  - Verify each requirement implemented
  - Check off in spec.md

- [ ] **TASK-123**: Verify all success criteria
  - Test each of 10 success criteria
  - Measure performance metrics
  - Verify security requirements
  - Document results

- [ ] **TASK-124**: Final code review
  - Review all new code for readability
  - Check for console.log statements
  - Check for TODOs and FIXMEs
  - Ensure consistent code style
  - Update comments and documentation

---

## Completion Checklist

### Implementation Complete When:

- [ ] All 124 tasks completed
- [ ] All 36 functional requirements (FR-001 to FR-036) implemented
- [ ] All 6 user stories have passing acceptance tests
- [ ] All 8 edge cases handled
- [ ] All 10 success criteria met
- [ ] Unit test coverage ≥80% for new code
- [ ] All accessibility tests pass (WCAG 2.1 AA)
- [ ] All security tests pass
- [ ] Manual testing completed on all target browsers
- [ ] Mobile responsive testing completed (320px-2560px)
- [ ] No console errors or warnings in production build
- [ ] Bundle size increase ≤200KB (gzipped)
- [ ] README and documentation updated
- [ ] Migration guide created
- [ ] All changes committed with conventional commit messages
- [ ] Feature branch ready for merge to main

---

**Task List Status**: ✅ Complete  
**Total Tasks**: 124  
**Estimated Time**: 24-35 days (solo developer)  
**Next Step**: Begin TASK-001 (Phase 0: Setup & Research)
