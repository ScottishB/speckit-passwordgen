# Feature Specification: User Authentication & Site Password Management

**Feature Branch**: `002-user-auth-sites`  
**Created**: 2025-12-19  
**Status**: Draft  
**Input**: User description: "Users need to log in to see their own passwords and assign them to specific sites"

## User Scenarios & Testing

### User Story 1 - User Registration & Login (Priority: P1)

Users can create an account with username/password and log in to access their personal password vault. This provides the foundation for all user-specific features.

**Why this priority**: Essential foundation - without user accounts, no other features can function. Delivers immediate value by securing user data.

**Independent Test**: Can be fully tested by creating an account, logging out, and logging back in. Success means user sees a personalized dashboard instead of public access.

**Acceptance Scenarios**:

1. **Given** I am a new user on the registration page, **When** I enter a unique username, valid password (min 12 chars, mixed case, numbers, special chars), **Then** my account is created and I am logged in
2. **Given** I have an existing account, **When** I enter correct username and password on login page, **Then** I am logged into my personal vault
3. **Given** I am logged in, **When** I log out, **Then** I am returned to login page and cannot access my vault without re-authenticating
4. **Given** I am on registration page, **When** I try to register with an existing username, **Then** I see error "Username already exists"
5. **Given** I am on registration page, **When** I enter a weak password (less than 12 chars or missing requirements), **Then** I see password strength requirements and cannot proceed

---

### User Story 2 - Two-Factor Authentication (Priority: P1)

Users must complete 2FA during login to add an extra security layer for their password vault.

**Why this priority**: Critical security requirement - password vaults are high-value targets. Must be implemented before users trust the system with real passwords.

**Independent Test**: Can be tested by enabling 2FA during registration, logging out, and verifying that login requires both password AND 2FA code. Success means unauthorized access is significantly harder.

**Acceptance Scenarios**:

1. **Given** I am registering a new account, **When** I complete password setup, **Then** I am prompted to set up 2FA (TOTP app like Google Authenticator)
2. **Given** I have scanned the QR code with my authenticator app, **When** I enter the 6-digit code, **Then** 2FA is enabled and I see backup codes
3. **Given** I am logging in with 2FA enabled, **When** I enter correct password, **Then** I am prompted for 6-digit 2FA code
4. **Given** I am on 2FA code entry, **When** I enter correct code from my app, **Then** I am logged into my vault
5. **Given** I am on 2FA code entry, **When** I enter incorrect code 3 times, **Then** I am locked out for 15 minutes
6. **Given** I have lost access to my 2FA device, **When** I use a backup code, **Then** I can log in and am prompted to re-setup 2FA

---

### User Story 3 - Assign Generated Passwords to Sites (Priority: P2)

Users can assign their generated passwords/passphrases to specific websites or IP addresses for organized password management.

**Why this priority**: Core feature that makes the vault useful for real-world password management. Without this, users only have a disconnected list of passwords.

**Independent Test**: Can be tested by generating a password, assigning it to "github.com", and verifying it appears in the site list. Success means users can organize passwords by destination.

**Acceptance Scenarios**:

1. **Given** I just generated a password, **When** I click "Assign to Site", **Then** I see a popup with fields for Site Name, URL/IP, Username, and Notes
2. **Given** I am in the assign popup, **When** I enter "GitHub" as site name and "github.com" as URL, **Then** the password is saved with these details
3. **Given** I am in the assign popup, **When** I enter "192.168.1.1" as IP address for "Home Router", **Then** the password is saved and validated as IP format
4. **Given** I am viewing my password history, **When** I click an unassigned password, **Then** I can assign it to a site retroactively
5. **Given** I am in the assign popup, **When** I leave the form open for 5 minutes without action, **Then** the popup times out for security

---

### User Story 4 - View & Manage Site Passwords (Priority: P2)

Users can view all their site/password combinations in an organized list, search/filter them, and copy passwords to clipboard.

**Why this priority**: Essential usability feature - users need quick access to their passwords. Directly supports the primary use case.

**Independent Test**: Can be tested by creating 5 site entries, searching for one by name, and copying its password. Success means users can efficiently retrieve any saved password.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I navigate to "Sites" section, **Then** I see a list of all my sites with passwords (passwords hidden by default)
2. **Given** I am viewing my sites list, **When** I click the "eye" icon next to a password, **Then** the password is revealed for 10 seconds then auto-hides
3. **Given** I am viewing a site entry, **When** I click "Copy Password", **Then** the password is copied to clipboard and I see "Copied!" confirmation
4. **Given** I have 20 saved sites, **When** I type "git" in the search box, **Then** only sites matching "git" (GitHub, GitLab) are displayed
5. **Given** I am viewing my sites list, **When** I sort by "Date Added" or "Alphabetical", **Then** the list reorders accordingly
6. **Given** I am viewing a site entry, **When** I click it, **Then** I see full details including username, URL/IP, notes, and creation date

---

### User Story 5 - Edit Site Password Details (Priority: P3)

Users can update site names, URLs, usernames, notes, or regenerate passwords for existing entries.

**Why this priority**: Important for maintenance but not critical for initial functionality. Users can delete and recreate entries as a workaround.

**Independent Test**: Can be tested by editing a site's URL from "github.com" to "github.enterprise.com" and verifying the change persists. Success means users can keep entries current.

**Acceptance Scenarios**:

1. **Given** I am viewing a site entry, **When** I click "Edit", **Then** I see an editable form with all current details pre-filled
2. **Given** I am editing a site, **When** I change the URL and click "Save", **Then** the new URL is saved and displayed
3. **Given** I am editing a site, **When** I click "Generate New Password", **Then** I see the password generator and can replace the old password
4. **Given** I am editing a site, **When** I change the username field, **Then** the new username is saved
5. **Given** I am editing a site with unsaved changes, **When** I click "Cancel", **Then** I see a confirmation "Discard changes?" before closing

---

### User Story 6 - Delete Account (Priority: P3)

Users can permanently delete their account and all associated data with appropriate warnings.

**Why this priority**: Legal requirement (GDPR, etc.) but not needed for core functionality. Can be added after MVP.

**Independent Test**: Can be tested by creating a test account, adding data, deleting the account, and verifying login fails and data is gone. Success means users have control over their data.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I navigate to Account Settings and click "Delete Account", **Then** I see a warning "This will permanently delete all your data. Type DELETE to confirm."
2. **Given** I am on the delete confirmation, **When** I type "DELETE" and click confirm, **Then** I am prompted to enter my password for final verification
3. **Given** I have entered my password for deletion, **When** I confirm, **Then** my account and all data are deleted and I see "Account deleted successfully"
4. **Given** I just deleted my account, **When** I try to log in with old credentials, **Then** I see "Invalid username or password"
5. **Given** I am deleting my account, **When** I have active sessions on other devices, **Then** all sessions are terminated immediately

---

### Edge Cases

- **What happens when a user loses both their 2FA device and backup codes?**  
  Account recovery requires support intervention. Users should be shown recovery options during setup (email recovery, security questions).

- **What happens when a user tries to assign the same password to multiple sites?**  
  System allows it (legitimate use case: single password for multiple test sites) but shows a warning about password reuse risks.

- **What happens when no password history exists for a new user?**  
  Sites section shows empty state with message "No passwords saved yet" and prominent "Generate Password" button.

- **What happens when a user's session expires while editing a site?**  
  User is redirected to login. After re-authentication, unsaved changes are lost (with prior warning). Consider auto-save drafts for future enhancement.

- **What happens when clipboard copy fails (browser permissions)?**  
  Show fallback UI with password visible and instruction "Select and copy manually" with auto-select of text.

- **What happens when a user enters an invalid URL/IP format?**  
  Show inline validation error: "Please enter valid URL (e.g., example.com) or IP address (e.g., 192.168.1.1)". Allow saving anyway with warning.

- **What happens when 2FA backup codes are exhausted?**  
  After last backup code is used, force user to re-setup 2FA with new codes before continuing.

- **What happens when concurrent logins occur (same user, different devices)?**  
  Allow multiple sessions (common use case: phone + laptop). Show active sessions in settings with ability to revoke.

## Requirements

### Functional Requirements

#### Authentication & Security

- **FR-001**: System MUST require unique usernames (3-50 chars, alphanumeric + underscore)
- **FR-002**: System MUST enforce strong passwords for user accounts (min 12 chars, uppercase, lowercase, number, special char)
- **FR-003**: System MUST hash user passwords using bcrypt or Argon2 before storage
- **FR-004**: System MUST implement TOTP-based 2FA (compatible with Google Authenticator, Authy)
- **FR-005**: System MUST generate 10 single-use backup codes during 2FA setup
- **FR-006**: System MUST lock accounts for 15 minutes after 3 failed 2FA attempts
- **FR-007**: System MUST implement session management with 30-minute idle timeout
- **FR-008**: System MUST log all security events (login, logout, failed attempts, 2FA changes)

#### Password & Site Management

- **FR-009**: Users MUST be able to assign generated passwords to sites via popup interface
- **FR-010**: System MUST support both URL (domain names) and IP address formats for sites
- **FR-011**: Users MUST be able to store site name, URL/IP, username, and notes (max 500 chars)
- **FR-012**: System MUST hide passwords by default in site list (show as "••••••••")
- **FR-013**: Users MUST be able to reveal passwords temporarily (10-second auto-hide)
- **FR-014**: Users MUST be able to copy passwords to clipboard with one click
- **FR-015**: System MUST show "Copied!" confirmation for 2 seconds after copying
- **FR-016**: Users MUST be able to search/filter sites by name or URL
- **FR-017**: Users MUST be able to sort sites by date added or alphabetically
- **FR-018**: System MUST support editing all site details except creation date
- **FR-019**: System MUST allow regenerating passwords for existing sites
- **FR-020**: System MUST preserve password history when editing sites

#### Data & User Management

- **FR-021**: System MUST isolate user data - users see only their own passwords
- **FR-022**: System MUST persist all user data locally using browser storage
- **FR-023**: Users MUST be able to delete their account with confirmation
- **FR-024**: System MUST require typing "DELETE" + password for account deletion
- **FR-025**: System MUST permanently remove all user data on account deletion
- **FR-026**: System MUST terminate all active sessions on account deletion
- **FR-027**: System MUST show empty state messaging when no passwords exist
- **FR-028**: System MUST handle storage quota limits gracefully

#### User Interface

- **FR-029**: System MUST provide clear navigation between Generator, Sites, and Settings sections
- **FR-030**: System MUST show password strength indicator during registration
- **FR-031**: System MUST display QR code for 2FA setup with manual entry alternative
- **FR-032**: System MUST show inline validation for all form fields
- **FR-033**: System MUST auto-focus relevant fields (username on login, 2FA code on 2FA step)
- **FR-034**: System MUST preserve form state during temporary errors (network issues)

### Key Entities

- **User Account**: Represents a registered user with username, hashed password, 2FA secret, backup codes, creation date, last login
- **Site Entry**: Represents a saved site/password combination with site name, URL/IP, username, password (encrypted), notes, creation date, last modified date, user ID (foreign key)
- **Session**: Represents an active login session with session token, user ID, creation time, last activity time, device/browser info
- **Security Event**: Represents logged security actions with event type (login, logout, failed attempt, 2FA change), user ID, timestamp, IP address, details

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete registration + 2FA setup in under 3 minutes
- **SC-002**: Users can assign a generated password to a site in under 30 seconds
- **SC-003**: Users can retrieve and copy a saved password in under 10 seconds
- **SC-004**: System prevents 100% of unauthorized access attempts (password + 2FA required)
- **SC-005**: Zero unencrypted passwords stored in browser storage
- **SC-006**: Search/filter returns results in under 500ms for up to 100 saved sites
- **SC-007**: 95% of users successfully enable 2FA on first attempt
- **SC-008**: Account deletion completes in under 10 seconds
- **SC-009**: System handles 10 concurrent users without performance degradation
- **SC-010**: Users can manage their vault on mobile devices without horizontal scrolling

## Assumptions

- Users have access to a smartphone with an authenticator app (Google Authenticator, Authy) for 2FA
- Users understand basic password security concepts (not reusing passwords, keeping 2FA device secure)
- Browser supports Web Crypto API for encryption and localStorage for data persistence
- Users will manage a reasonable number of sites (< 1000) - no server-side storage/sync
- This is a local-first application - no cloud backup or multi-device sync in initial release
- Users are responsible for their own data backup (export feature could be added later)
- Account recovery without 2FA device requires support contact (no automated email recovery initially)

## Dependencies

- Existing password generator functionality (from feature 001)
- Encryption library for storing passwords securely (Web Crypto API or CryptoJS)
- TOTP library for 2FA implementation (otpauth or similar)
- QR code generation library for 2FA setup (qrcode.js or similar)
- Form validation library or custom validation logic
- Updated UI/UX design to accommodate login flow and new sections

## Out of Scope

- Cloud storage or server-side data persistence
- Multi-device synchronization
- Email-based account recovery
- OAuth/SSO integration (Google, GitHub login)
- Password sharing between users
- Password strength analysis for saved passwords
- Automatic password change reminders
- Browser extension integration
- Import/export functionality (could be future enhancement)
- Biometric authentication (fingerprint, Face ID)
- Password breach checking against known databases
- Team/family sharing features
