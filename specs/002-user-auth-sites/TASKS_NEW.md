# Tasks: User Authentication & Site Password Management

**Feature**: 002-user-auth-sites  
**Generated**: 2025-12-23  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

**Total Tasks**: 150

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install cryptography dependencies (argon2-browser, otpauth, qrcode, @types/qrcode) via npm
- [ ] T002 Create test infrastructure directories (tests/services/auth/, tests/services/crypto/, tests/components/auth/)
- [ ] T003 [P] Benchmark PBKDF2 key derivation performance with scripts/benchmark-pbkdf2.html
- [ ] T004 [P] Verify Web Crypto API browser support with feature detection utility in src/utils/cryptoSupport.ts
- [ ] T005 [P] Prototype argon2-browser password hashing in scripts/test-argon2.html
- [ ] T006 [P] Prototype TOTP integration with otpauth in scripts/test-totp.html
- [ ] T007 [P] Prototype QR code generation with qrcode library in scripts/test-qrcode.html
- [ ] T008 Document security best practices in SECURITY.md (OWASP/NIST guidelines)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Models

- [ ] T009 [P] Create User model in src/models/User.ts (id, username, passwordHash, salt, totpSecret, backupCodes, timestamps)
- [ ] T010 [P] Create Session model in src/models/Session.ts (id, userId, sessionToken, timestamps, deviceInfo)
- [ ] T011 [P] Create SecurityEvent model in src/models/SecurityEvent.ts (10 event types, userId, timestamp, details)
- [ ] T012 [P] Create EncryptedVault model in src/models/EncryptedVault.ts (userId, encryptedData, iv, salt)
- [ ] T013 [P] Create Site model in src/models/Site.ts (id, userId, siteName, url, username, password, notes, timestamps)

### CryptoService Implementation

- [ ] T014 Create CryptoService class structure in src/services/CryptoService.ts (constants, error classes, JSDoc)
- [ ] T015 Implement password hashing methods (hashPassword, verifyPassword) using Argon2id in src/services/CryptoService.ts
- [ ] T016 Implement key derivation method (deriveEncryptionKey) using PBKDF2-SHA256 100K iterations in src/services/CryptoService.ts
- [ ] T017 Implement data encryption method (encryptData) using AES-256-GCM in src/services/CryptoService.ts
- [ ] T018 Implement data decryption method (decryptData) using AES-256-GCM in src/services/CryptoService.ts
- [ ] T019 Implement utility methods (generateToken, generateUUID, validatePasswordStrength) in src/services/CryptoService.ts

### CryptoService Testing

- [ ] T020 [P] Write unit tests for password hashing in tests/services/crypto/CryptoService.hash.test.ts (24 tests)
- [ ] T021 [P] Write unit tests for encryption/decryption in tests/services/crypto/CryptoService.encryption.test.ts (127 tests)
- [ ] T022 [P] Write unit tests for key derivation in tests/services/crypto/CryptoService.keyderivation.test.ts (27 tests)

### Database Refactoring

- [ ] T023 Refactor Database class for multi-user support in src/database.ts (users, sessions, vault storage keys)
- [ ] T024 Implement user CRUD methods in src/database.ts (saveUser, getUser, getUserByUsername, getAllUsers, updateUser, deleteUser)
- [ ] T025 Implement session methods in src/database.ts (saveSession, getSession, deleteSession, getUserSessions, deleteAllUserSessions)
- [ ] T026 Implement encrypted vault methods in src/database.ts (saveVault, getVault, deleteVault with userId scoping)

### Database Testing

- [ ] T027 [P] Write unit tests for user CRUD operations in tests/database/Database.users.test.ts (68 tests)
- [ ] T028 [P] Write unit tests for session management in tests/database/Database.sessions.test.ts (64 tests)
- [ ] T029 [P] Write unit tests for vault operations in tests/database/Database.vault.test.ts (56 tests)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Registration & Login (Priority: P1) 🎯 MVP

**Goal**: Users can create accounts with username/password and log in to access their personal password vault

**Independent Test**: Create account → logout → login with credentials → verify authenticated state and access to dashboard

### SessionService Implementation

- [ ] T030 [P] [US1] Create SessionService class structure in src/services/SessionService.ts (timeout constants, dependencies)
- [ ] T031 [US1] Implement session lifecycle methods in src/services/SessionService.ts (createSession, getSession, updateActivity, invalidateSession)
- [ ] T032 [US1] Implement session timeout logic in src/services/SessionService.ts (isSessionExpired with idle/absolute checks)
- [ ] T033 [US1] Implement automatic session cleanup in src/services/SessionService.ts (startExpirationCheck, stopExpirationCheck, cleanupExpiredSessions)
- [ ] T034 [US1] Implement multi-session management in src/services/SessionService.ts (getUserSessions, invalidateAllUserSessions)

### SessionService Testing

- [ ] T035 [P] [US1] Write unit tests for session lifecycle in tests/services/session/SessionService.lifecycle.test.ts (62 tests)
- [ ] T036 [P] [US1] Write unit tests for session timeouts in tests/services/session/SessionService.timeouts.test.ts (46 tests)
- [ ] T037 [P] [US1] Write unit tests for session cleanup in tests/services/session/SessionService.cleanup.test.ts (54 tests)
- [ ] T038 [P] [US1] Write unit tests for multi-session management in tests/services/session/SessionService.multi.test.ts (60 tests)

### SecurityLogService Implementation

- [ ] T039 [P] [US1] Create SecurityLogService class in src/services/SecurityLogService.ts (Database dependency, JSDoc)
- [ ] T040 [US1] Implement security logging methods in src/services/SecurityLogService.ts (logEvent, getUserEvents, getEventsByType, clearUserEvents)
- [ ] T041 [P] [US1] Write unit tests for SecurityLogService in tests/services/security/SecurityLogService.test.ts (60 tests)

### AuthService Implementation

- [ ] T042 [US1] Create AuthService class in src/services/AuthService.ts (dependencies, state, error classes)
- [ ] T043 [US1] Implement user registration in src/services/AuthService.ts (username validation, password strength, Argon2id hashing, event logging)
- [ ] T044 [US1] Implement user login in src/services/AuthService.ts (password verification, failed attempts tracking, account lockout, session creation)
- [ ] T045 [US1] Implement authentication helpers in src/services/AuthService.ts (logout, getCurrentUser, getCurrentSession, isAuthenticated, validatePasswordStrength, isUsernameAvailable)
- [ ] T046 [US1] Implement account deletion in src/services/AuthService.ts (password verification, vault/session cleanup, event logging)

### AuthService Testing

- [ ] T047 [P] [US1] Write unit tests for AuthService registration in tests/services/auth/AuthService.test.ts (10 tests for registration)
- [ ] T048 [P] [US1] Write unit tests for AuthService login in tests/services/auth/AuthService.test.ts (30 tests for login, lockout, state)
- [ ] T049 [P] [US1] Write unit tests for AuthService account deletion in tests/services/auth/AuthService.test.ts (10 tests for deletion)

### Authentication UI Components

- [ ] T050 [P] [US1] Create LoginForm component structure in src/components/LoginForm.ts (HTML template with username, password, submit)
- [ ] T051 [US1] Implement LoginForm logic in src/components/LoginForm.ts (validation, AuthService.login, error handling, loading states, success event)
- [ ] T052 [US1] Style LoginForm component in src/styles/auth.css (responsive, WCAG AA contrast, focus states, error states)
- [ ] T053 [P] [US1] Write unit tests for LoginForm in tests/components/auth/LoginForm.test.ts (34 tests for validation, submission, errors)

- [ ] T054 [P] [US1] Create RegisterForm component structure in src/components/RegisterForm.ts (HTML with username, password, confirm password, strength indicator)
- [ ] T055 [US1] Implement RegisterForm logic in src/components/RegisterForm.ts (username availability check, password strength validation, AuthService.register, success event)
- [ ] T056 [US1] Implement password strength indicator in src/components/RegisterForm.ts (5 requirements, progress bar, color coding)
- [ ] T057 [P] [US1] Write unit tests for RegisterForm in tests/components/auth/RegisterForm.test.ts (58 tests for validation, strength, submission)

### Auth Routing Integration

- [ ] T058 [US1] Update AppComponent for auth routing in src/main.ts (check authentication, show LoginForm/RegisterForm vs main app)
- [ ] T059 [US1] Implement session activity tracking in src/main.ts (mousedown, keydown, touchstart, scroll listeners with throttle)
- [ ] T060 [US1] Add logout button to header in src/main.ts (addLogoutButton, handleLogout with confirmation)
- [ ] T061 [US1] Add auth stylesheet to index.html (link to src/styles/auth.css)

### Accessibility Testing

- [ ] T062 [P] [US1] Write accessibility tests for auth forms in tests/accessibility/auth.a11y.test.ts (34 tests for ARIA, keyboard, screen reader)
- [ ] T063 [P] [US1] Write integration tests for auth UI flow in tests/integration/auth.integration.test.ts (14 tests for registration, login, logout, timeout)

**Checkpoint**: Users can register, login, logout, and access authenticated dashboard. Account lockout works. Sessions expire properly.

---

## Phase 4: User Story 2 - Two-Factor Authentication (Priority: P1) 🎯 MVP

**Goal**: Users can optionally enable TOTP 2FA during registration or later in settings for enhanced vault security

**Independent Test**: Enable 2FA during registration → scan QR code → logout → login requires password + 6-digit code → verify access granted only with both factors

### TotpService Implementation

- [ ] T064 [P] [US2] Create TotpService class in src/services/TotpService.ts (constants: BACKUP_CODE_COUNT=10, TOTP_DIGITS=6, PERIOD=30, WINDOW=1)
- [ ] T065 [P] [US2] Implement TOTP secret generation in src/services/TotpService.ts (generateSecret using OTPAuth.Secret 160-bit)
- [ ] T066 [P] [US2] Implement QR code generation in src/services/TotpService.ts (generateQRCode with TOTP URI, 256x256 size)
- [ ] T067 [P] [US2] Implement TOTP token validation in src/services/TotpService.ts (validateToken with ±30s drift tolerance)
- [ ] T068 [US2] Implement backup codes in src/services/TotpService.ts (generateBackupCodes, hashBackupCode, validateBackupCode, areBackupCodesExhausted, getRemainingBackupCodesCount)

### TotpService Testing

- [ ] T069 [P] [US2] Write unit tests for TotpService in tests/services/totp/TotpService.test.ts (60 tests for secret, validation, backup codes)

### 2FA Integration with AuthService

- [ ] T070 [US2] Update User model for 2FA fields in src/models/User.ts (verify totpSecret, backupCodes, backupCodesUsed, lastFailedLogin)
- [ ] T071 [US2] Update AuthService for 2FA registration flow in src/services/AuthService.ts (enable2FA method generates secret/QR/backup codes)
- [ ] T072 [US2] Update AuthService login for 2FA in src/services/AuthService.ts (validate TOTP code, validate backup code, mark code used, 2FA lockout)
- [ ] T073 [US2] Add 2FA management methods to AuthService in src/services/AuthService.ts (disable2FA with password, regenerateBackupCodes)

### 2FA Testing

- [ ] T074 [P] [US2] Write integration tests for 2FA flow in tests/services/auth/AuthService.2fa.test.ts (50 tests for setup, login, backup codes, lockout)

### TOTP Setup Modal Component

- [ ] T075 [P] [US2] Create TotpSetupModal component structure in src/components/TotpSetupModal.ts (modal with QR display, code input, backup codes)
- [ ] T076 [US2] Implement TotpSetupModal logic in src/components/TotpSetupModal.ts (call enable2FA, display QR, validate code, show backup codes, copy/print buttons)
- [ ] T077 [US2] Style TotpSetupModal component in src/styles/auth.css (modal overlay, QR centered, backup codes grid, print styles)
- [ ] T078 [P] [US2] Write unit tests for TotpSetupModal in tests/components/auth/TotpSetupModal.test.ts (47 tests for initialization, verification, backup codes)

### 2FA Login Integration

- [ ] T079 [US2] Update LoginForm for 2FA code input in src/components/LoginForm.ts (show 2FA input when required, validate 6-digit/8-char format)
- [ ] T080 [US2] Update AppComponent to show TOTP modal after registration in src/main.ts (listen for register-success, open TotpSetupModal)

**Checkpoint**: Users can enable 2FA with QR codes, backup codes work, 2FA is required at login when enabled, lockout after 3 failed attempts works.

---

## Phase 5: User Story 3 - Assign Generated Passwords to Sites (Priority: P2)

**Goal**: Users can assign generated passwords/passphrases to specific websites or IP addresses for organized password management

**Independent Test**: Generate password → click "Assign to Site" → fill form (siteName="GitHub", url="github.com", username="user@example.com") → verify appears in site list

### SiteService Implementation

- [ ] T081 [P] [US3] Create SiteService class in src/services/SiteService.ts (dependencies: CryptoService, AuthService, Database)
- [ ] T082 [US3] Implement site CRUD operations in src/services/SiteService.ts (createSite, getSite, getAllSites, updateSite, deleteSite with encryption)
- [ ] T083 [P] [US3] Implement site search and filtering in src/services/SiteService.ts (searchSites by name/URL case-insensitive)
- [ ] T084 [P] [US3] Implement site sorting in src/services/SiteService.ts (sortSites by name/dateAdded/dateModified with asc/desc)
- [ ] T085 [P] [US3] Implement URL/IP validation in src/services/SiteService.ts (validateUrlOrIp with regex for IPv4/IPv6/URL)
- [ ] T086 [P] [US3] Implement password reuse checking in src/services/SiteService.ts (checkPasswordReuse decrypts all, compares)

### SiteService Testing

- [ ] T087 [P] [US3] Write unit tests for SiteService in tests/services/sites/SiteService.test.ts (34 tests for CRUD, search, sort, validation, reuse)

### HistoryService Updates

- [ ] T088 [US3] Update HistoryService for user-scoped queries in src/services/HistoryService.ts (add userId parameter, filter by userId)
- [ ] T089 [US3] Update HistoryListComponent to pass userId in src/components/HistoryListComponent.ts (inject AuthService, pass userId to service calls)
- [ ] T090 [US3] Update main.ts to pass AuthService to HistoryListComponent in src/main.ts (constructor parameter)

### SiteAssignModal Component

- [ ] T091 [P] [US3] Create SiteAssignModal component structure in src/components/SiteAssignModal.ts (modal with siteName, url, username, notes, pre-filled password)
- [ ] T092 [US3] Implement SiteAssignModal logic in src/components/SiteAssignModal.ts (validation, URL/IP format check, password reuse warning, 5-min timeout, SiteService.createSite)
- [ ] T093 [US3] Integrate SiteAssignModal with generator forms in src/components/PasswordForm.ts and PassphraseForm.ts (show "Assign to Site" button after generation)
- [ ] T094 [US3] Update main.ts for SiteAssignModal integration in src/main.ts (SiteService init, openSiteAssignModal method, event listeners)
- [ ] T095 [US3] Style SiteAssignModal in src/styles/sites.css (modal overlay, form layout, error states, warning messages)

**Checkpoint**: Users can assign generated passwords to sites, URL/IP validation works, password reuse warnings appear, assignments saved to encrypted vault.

---

## Phase 6: User Story 4 - View & Manage Site Passwords (Priority: P2)

**Goal**: Users can view all site/password combinations in an organized list, search/filter them, and copy passwords to clipboard

**Independent Test**: Navigate to Sites section → see list of saved sites → search for "github" → click eye icon to reveal password → click "Copy Password" → verify clipboard contains password

### SitesListView Component

- [ ] T096 [P] [US4] Create SitesListView component structure in src/components/SitesListView.ts (search input, sort dropdown, table/card view, empty state)
- [ ] T097 [US4] Implement SitesListView logic in src/components/SitesListView.ts (load sites, debounced search 300ms, sort handler, responsive rendering, password reveal 10s auto-hide, copy to clipboard)
- [ ] T098 [US4] Style SitesListView component in src/styles/sites.css (desktop table, mobile cards, password reveal, copy confirmation animation, responsive @media 768px)

### SiteDetailModal Component

- [ ] T099 [P] [US4] Create SiteDetailModal component structure in src/components/SiteDetailModal.ts (modal with read-only fields, action buttons: Copy, Edit, Delete, Regenerate)
- [ ] T100 [US4] Implement SiteDetailModal logic in src/components/SiteDetailModal.ts (load site, togglePassword, copyPassword with clipboard API, handleEdit/Delete/Regenerate events)
- [ ] T101 [US4] Style SiteDetailModal in src/styles/sites.css (modal layout, field display, button icons, mobile responsive)

### Main App Integration

- [ ] T102 [US4] Add Sites tab to main navigation in src/main.ts (add tab alongside Password/Passphrase tabs)
- [ ] T103 [US4] Initialize SitesListView in AppComponent in src/main.ts (create instance, attach to container, handle routing)
- [ ] T104 [US4] Add sites.css to index.html (link stylesheet)

### Testing

- [ ] T105 [P] [US4] Write unit tests for SitesListView in tests/components/sites/SitesListView.test.ts (40 tests for render, search, sort, reveal, copy)
- [ ] T106 [P] [US4] Write unit tests for SiteDetailModal in tests/components/sites/SiteDetailModal.test.ts (25 tests for display, actions, events)

**Checkpoint**: Users can view all saved sites, search/filter works, passwords can be revealed and copied, modal shows full details, responsive on mobile.

---

## Phase 7: User Story 5 - Edit Site Password Details (Priority: P3)

**Goal**: Users can update site names, URLs, usernames, notes, or regenerate passwords for existing entries

**Independent Test**: Click Edit on site → change URL from "github.com" to "github.enterprise.com" → save → verify change persists and lastModified timestamp updated

### SiteEditModal Component

- [ ] T107 [P] [US5] Create SiteEditModal component structure in src/components/SiteEditModal.ts (modal with editable form fields, Save/Cancel/Generate buttons)
- [ ] T108 [US5] Implement SiteEditModal logic in src/components/SiteEditModal.ts (load site data, validation, SiteService.updateSite, password regeneration flow)
- [ ] T109 [US5] Implement unsaved changes detection in src/components/SiteEditModal.ts (track dirty state, confirm discard on cancel)
- [ ] T110 [US5] Style SiteEditModal in src/styles/sites.css (form layout, validation errors, action buttons)

### Password Regeneration Integration

- [ ] T111 [US5] Add password regeneration to SiteEditModal in src/components/SiteEditModal.ts (open PasswordForm modal, receive new password, update field)
- [ ] T112 [US5] Preserve password history when regenerating in src/services/SiteService.ts (maintain history array, add timestamp to old password)

### Integration

- [ ] T113 [US5] Connect SiteDetailModal Edit button to SiteEditModal in src/components/SiteDetailModal.ts (dispatch edit event with siteId)
- [ ] T114 [US5] Connect SitesListView Edit button to SiteEditModal in src/components/SitesListView.ts (dispatch edit event with siteId)

### Testing

- [ ] T115 [P] [US5] Write unit tests for SiteEditModal in tests/components/sites/SiteEditModal.test.ts (35 tests for editing, validation, regeneration, unsaved changes)
- [ ] T116 [P] [US5] Write integration tests for edit workflow in tests/integration/sites.integration.test.ts (15 tests for full edit flow, password regeneration)

**Checkpoint**: Users can edit all site fields, URL/username changes save, password regeneration works, unsaved changes prompt appears, history is preserved.

---

## Phase 8: User Story 6 - Delete Account (Priority: P3)

**Goal**: Users can permanently delete their account and all associated data with appropriate warnings

**Independent Test**: Navigate to Settings → click "Delete Account" → type "DELETE" → enter password → confirm → verify logged out, re-login fails, localStorage cleared

### Account Settings Component

- [ ] T117 [P] [US6] Create SettingsView component structure in src/components/SettingsView.ts (sections: Account Info, 2FA Management, Delete Account)
- [ ] T118 [US6] Implement account info section in src/components/SettingsView.ts (display username, creation date, last login, session count)
- [ ] T119 [US6] Implement 2FA management section in src/components/SettingsView.ts (enable/disable toggle, regenerate backup codes button, show remaining codes count)
- [ ] T120 [US6] Implement delete account section in src/components/SettingsView.ts (show warning, type "DELETE" confirmation, password input, final confirm button)
- [ ] T121 [US6] Style SettingsView in src/styles/settings.css (section layout, danger zone styling, confirmation modals)

### Account Deletion Logic

- [ ] T122 [US6] Implement delete account workflow in src/components/SettingsView.ts (validate "DELETE" text, call AuthService.deleteAccount with password, handle success/error)
- [ ] T123 [US6] Verify AuthService.deleteAccount implementation in src/services/AuthService.ts (password check, log event, delete vault, invalidate sessions, delete user, clear state)
- [ ] T124 [US6] Add post-deletion redirect in src/main.ts (listen for account-deleted event, clear app state, show login with success message)

### Integration

- [ ] T125 [US6] Add Settings tab to main navigation in src/main.ts (add tab alongside Password/Passphrase/Sites tabs)
- [ ] T126 [US6] Initialize SettingsView in AppComponent in src/main.ts (create instance, attach to container, handle routing)
- [ ] T127 [US6] Add settings.css to index.html (link stylesheet)

### Testing

- [ ] T128 [P] [US6] Write unit tests for SettingsView in tests/components/settings/SettingsView.test.ts (40 tests for account info, 2FA management, delete account)
- [ ] T129 [P] [US6] Write integration tests for account deletion in tests/integration/account.integration.test.ts (10 tests for full deletion flow, session termination, data removal)

**Checkpoint**: Users can view account settings, manage 2FA, delete account with proper confirmation, all data removed, sessions terminated, re-login impossible.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Code Quality

- [ ] T130 [P] Wrap console.log statements in DEV checks across all files (if import.meta.env.DEV)
- [ ] T131 [P] Update vite.config.ts for production builds (drop_console: true in terserOptions)
- [ ] T132 [P] Code cleanup and refactoring for consistency across services
- [ ] T133 [P] Add comprehensive JSDoc comments to all public methods

### Performance Optimization

- [ ] T134 [P] Optimize SiteService search performance for large vaults (100+ sites target <500ms)
- [ ] T135 [P] Add loading states to all async operations in UI components
- [ ] T136 [P] Implement debouncing for all search inputs (300ms standard)

### Security Hardening

- [ ] T137 [P] Add rate limiting to login attempts in AuthService (5 attempts per 15 minutes)
- [ ] T138 [P] Add common password blacklist to validatePasswordStrength in CryptoService
- [ ] T139 [P] Implement session token rotation on privilege escalation in SessionService
- [ ] T140 [P] Add Content Security Policy headers to index.html

### Documentation

- [ ] T141 [P] Create user documentation in docs/USER_GUIDE.md (registration, 2FA setup, site management)
- [ ] T142 [P] Create developer documentation in docs/DEVELOPER.md (architecture, services, testing)
- [ ] T143 [P] Update README.md with new authentication features and screenshots
- [ ] T144 [P] Create API documentation for all services in docs/API.md

### Testing Improvements

- [ ] T145 [P] Increase test coverage to 85%+ for all services in tests/
- [ ] T146 [P] Add E2E tests for critical user journeys in tests/e2e/ (registration → 2FA → assign → view)
- [ ] T147 [P] Add security-specific tests in tests/security/ (timing attacks, tamper detection, rate limiting)

### Final Validation

- [ ] T148 Run all tests and ensure 100% pass rate
- [ ] T149 Perform manual testing on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] T150 Validate quickstart.md scenarios and update with final results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - US1 (Registration/Login) → Required by all other stories
  - US2 (2FA) → Can start after US1 complete
  - US3 (Assign to Sites) → Requires US1, enhances US4
  - US4 (View Sites) → Requires US1 and US3
  - US5 (Edit Sites) → Requires US1, US3, US4
  - US6 (Delete Account) → Requires US1
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: FOUNDATIONAL - All other stories depend on this
- **User Story 2 (P1)**: Depends on US1 (AuthService must exist)
- **User Story 3 (P2)**: Depends on US1 (requires authentication)
- **User Story 4 (P2)**: Depends on US1 and US3 (needs sites to view)
- **User Story 5 (P3)**: Depends on US1, US3, US4 (needs sites to edit)
- **User Story 6 (P3)**: Depends on US1 (requires account to delete)

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T003, T004, T005, T006, T007 can all run in parallel (independent prototypes/scripts)

**Within Foundational (Phase 2)**:
- T009-T013 (all models) can run in parallel
- T020-T022 (all CryptoService tests) can run in parallel after T019
- T027-T029 (all Database tests) can run in parallel after T026

**Within User Story 1 (Phase 3)**:
- T035-T038 (SessionService tests) can run in parallel after T034
- T047-T049 (AuthService tests) can run in parallel after T046
- T050, T054 (LoginForm structure, RegisterForm structure) can run in parallel
- T053 (LoginForm tests), T057 (RegisterForm tests), T062 (accessibility tests) can run in parallel
- T030, T039 (SessionService, SecurityLogService class creation) can run in parallel

**Within User Story 2 (Phase 4)**:
- T064-T067 (TotpService methods) can run in parallel
- T069, T074 (TotpService tests, 2FA integration tests) can run after their implementations
- T075 (TotpSetupModal structure) can start while T064-T068 in progress

**Within User Story 3 (Phase 5)**:
- T083-T086 (search, sort, validation, reuse) can run in parallel after T082
- T087 (tests) can run after T082-T086

**Within User Story 4 (Phase 6)**:
- T096, T099 (SitesListView structure, SiteDetailModal structure) can run in parallel
- T105, T106 (tests) can run in parallel after implementations

**Within User Story 5 (Phase 7)**:
- T115, T116 (tests) can run in parallel after implementations

**Within User Story 6 (Phase 8)**:
- T128, T129 (tests) can run in parallel after implementations

**Within Polish (Phase 9)**:
- T130-T144 (most polish tasks) can run in parallel
- T145-T147 (testing improvements) can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T029) - **CRITICAL GATE**
3. Complete Phase 3: User Story 1 (T030-T063)
4. **STOP and VALIDATE**: Test registration/login flow independently
5. Complete Phase 4: User Story 2 (T064-T080)
6. **STOP and VALIDATE**: Test 2FA setup and login flow independently
7. Deploy/demo MVP: Users can register, login with 2FA, access vault

**MVP Delivers**: Secure authentication with optional 2FA, session management, account deletion

### Incremental Delivery (Add Site Management)

8. Complete Phase 5: User Story 3 (T081-T095) - Password assignment
9. **VALIDATE**: Generate password → assign to site → verify saved
10. Complete Phase 6: User Story 4 (T096-T106) - View/manage sites
11. **VALIDATE**: View sites list → search → copy password → verify clipboard
12. Deploy/demo v2: Full password vault with site management

### Full Feature Set

13. Complete Phase 7: User Story 5 (T107-T116) - Edit site details
14. Complete Phase 8: User Story 6 (T117-T129) - Account settings and deletion
15. Complete Phase 9: Polish (T130-T150) - Production readiness
16. Final validation and deployment

### Parallel Team Strategy

With 3 developers after Foundational phase:
- **Developer A**: User Story 1 (T030-T063) - Authentication core
- **Developer B**: User Story 2 (T064-T080) - 2FA (depends on AuthService from A)
- **Developer C**: Setup polish tasks (T130-T144) or prepare US3 structure

Once US1 complete, all can work in parallel:
- **Developer A**: User Story 3 (T081-T095) - Site assignment
- **Developer B**: User Story 4 (T096-T106) - Site viewing
- **Developer C**: User Story 5 (T107-T116) - Site editing

---

## Notes

- **[P] marker**: Tasks that can run in parallel (different files, no dependencies)
- **[US#] label**: Maps task to specific user story for traceability
- **Checkpoints**: Stop after each user story phase to validate independently
- **Test First**: For critical flows, consider writing tests before implementation
- **Commit Frequently**: Commit after each task or logical group
- **Security Priority**: CryptoService and AuthService require careful review
- **Accessibility**: All UI components must meet WCAG 2.1 AA standards
- **Performance**: Show loading states for crypto operations (1-3 seconds)
- **Error Handling**: All service methods should throw appropriate error types

**Total Estimated Time**: 4-6 weeks for full implementation with 1 developer, 2-3 weeks with 2-3 developers in parallel
