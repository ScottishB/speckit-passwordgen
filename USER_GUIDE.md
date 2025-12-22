# User Guide

Complete guide to using the Password Manager—from first-time setup to daily password management.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your Account](#creating-your-account)
3. [Two-Factor Authentication](#two-factor-authentication)
4. [Managing Your Vault](#managing-your-vault)
5. [Generating Passwords](#generating-passwords)
6. [Security & Best Practices](#security--best-practices)
7. [Account Management](#account-management)
8. [Troubleshooting](#troubleshooting)
9. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### What You Need

- **Modern Web Browser**:
  - Chrome 90+ or Edge 90+
  - Firefox 88+
  - Safari 14+
- **HTTPS Connection**: Required for Web Crypto API (automatically provided in production)
- **Authenticator App** (optional): For two-factor authentication (Authy, Google Authenticator, 1Password, etc.)

### First Visit

1. Open the password manager URL in your browser
2. You'll see the login/registration screen
3. Choose **"Register"** to create your account

---

## Creating Your Account

### Step 1: Choose Your Username

- Enter a unique username (3-50 characters)
- Allowed characters: letters, numbers, underscores, hyphens, @, .
- Example: `john_doe`, `user@example.com`, `alice-2024`

### Step 2: Create Your Master Password

⚠️ **CRITICAL**: Your master password **cannot be recovered** if forgotten!

**Requirements**:
- Minimum 8 characters (12+ strongly recommended)
- Must achieve "Good" or "Strong" rating (score 3-4)
- The app uses zxcvbn for strength evaluation

**Tips for Strong Passwords**:
- Use a passphrase: `correct-horse-battery-staple`
- Mix uppercase, lowercase, numbers, symbols: `MyP@ssw0rd2024!`
- Avoid dictionary words, personal info, common patterns
- Longer is better: `ILoveHikingInTheRockyMountainsEverySpring2024`

**Strength Meter**:
- 🔴 **Weak/Fair** (Score 0-2): Rejected
- 🟡 **Good** (Score 3): Accepted
- 🟢 **Strong** (Score 4): Excellent

### Step 3: Confirm Password

- Re-enter your master password to confirm
- Must match exactly (case-sensitive)

### Step 4: Register

- Click **"Create Account"**
- Your account is created instantly
- You're automatically logged in
- Your encrypted vault is now ready to use

### What Happens Behind the Scenes

1. Your password is hashed using **Argon2id** (takes ~500ms—this is normal!)
2. A unique salt is generated for your account
3. Your encryption key is derived from your password
4. Your vault is created and encrypted with AES-256-GCM
5. A session token is generated for your login session

---

## Two-Factor Authentication

Two-factor authentication (2FA) adds an extra layer of security to your account.

### Why Enable 2FA?

- **Extra Security**: Even if someone knows your password, they can't log in without your 2FA device
- **Recommended**: Especially if you store sensitive credentials
- **Standard Practice**: Industry-standard TOTP (Time-based One-Time Password)

### Setting Up 2FA

#### Step 1: Navigate to Settings

- Click the **⚙️ Settings** icon in the navigation
- Find the "Two-Factor Authentication" section

#### Step 2: Enable 2FA

- Click **"Enable Two-Factor Authentication"**
- A QR code will appear instantly

#### Step 3: Scan QR Code

1. Open your authenticator app:
   - **Recommended**: Authy, Google Authenticator, Microsoft Authenticator, 1Password
   - Available on iOS and Android
2. Choose "Add account" or "Scan QR code"
3. Point your camera at the QR code on screen
4. The account will be added to your authenticator app

#### Step 4: Verify Setup

- Your authenticator app will display a 6-digit code
- Enter this code in the verification field
- Click **"Verify and Enable"**

#### Step 5: Save Backup Codes

⚠️ **IMPORTANT**: You'll receive 10 backup codes

**What Are Backup Codes?**
- Single-use codes for accessing your account if you lose your 2FA device
- Format: 8-character alphanumeric (e.g., `A3B7C9D2`)

**How to Store Backup Codes**:
- **Print them**: Store printed copy in secure physical location
- **Save to password manager**: Store in separate password manager
- **Secure note**: Write down and store in safe/lockbox
- **DON'T**: Screenshot and leave on your device

### Using 2FA at Login

1. Enter your username and password as normal
2. Click **"Sign In"**
3. You'll be prompted for your 2FA code
4. Open your authenticator app
5. Enter the current 6-digit code
6. Click **"Verify"**

**If Code Doesn't Work**:
- Wait 30 seconds for the next code (codes refresh every 30 seconds)
- Ensure your device clock is accurate (TOTP requires time sync)
- Use a backup code if you can't access your authenticator app

### Using Backup Codes

1. At the 2FA code prompt, click **"Use Backup Code"**
2. Enter one of your saved backup codes
3. Click **"Verify"**
4. ⚠️ **Important**: Each backup code can only be used once

**Running Low on Backup Codes?**
- Go to Settings → Two-Factor Authentication
- Click **"Regenerate Backup Codes"**
- This will invalidate all old codes and generate 10 new ones
- Save the new codes securely

### Disabling 2FA

⚠️ **Not Recommended** unless absolutely necessary

1. Navigate to Settings → Two-Factor Authentication
2. Click **"Disable Two-Factor Authentication"**
3. Enter your current 2FA code or a backup code
4. Confirm you want to disable 2FA

---

## Managing Your Vault

Your vault is the encrypted storage for all your site credentials.

### Adding Your First Site

#### Step 1: Click "New Site"

- Click the **"+ New Site"** button at the top of the Sites view
- A modal will appear

#### Step 2: Fill in Site Details

**Required Fields**:
- **Site Name**: Descriptive name (e.g., "Gmail", "Amazon", "Bank of America")

**Optional Fields**:
- **URL**: Website address (e.g., `https://www.gmail.com`)
- **Username**: Your username/email for this site
- **Password**: Your password for this site
- **Notes**: Any additional information (security questions, hints, etc.)

#### Step 3: Generate or Enter Password

**Option A: Generate New Password**
1. Click **"Generate Password"** button
2. Customize options:
   - Length (8-128 characters)
   - Include uppercase, lowercase, numbers, symbols
   - Minimum numbers and symbols
3. Click **"Generate"**
4. Password automatically fills the password field

**Option B: Enter Existing Password**
- Manually type your existing password
- Use this if you already have a password for the site

#### Step 4: Save Site

- Review all information
- Click **"Save Site"**
- Your site is now encrypted and stored in your vault

### Viewing Site Details

1. Click on any site card in your vault
2. A detail modal appears showing all information
3. Passwords are hidden by default

**Toggle Password Visibility**:
- Click the **👁️ Show** button to reveal the password
- Click **👁️ Hide** to conceal it again

**Copy to Clipboard**:
- Click **📋 Copy Username** to copy username
- Click **📋 Copy Password** to copy password
- A confirmation message appears briefly

### Editing Sites

#### Step 1: Open Site Details

- Click on the site you want to edit

#### Step 2: Click "Edit"

- Click the **✏️ Edit** button
- The edit modal opens with all fields populated

#### Step 3: Make Changes

- Update any fields you want to change
- Generate a new password if needed
- Add or modify notes

#### Step 4: Save Changes

- Click **"Save Changes"**
- Your updates are encrypted and stored

#### Cancel Editing

- Click **"Cancel"** to discard changes
- Or press **Escape** key

### Deleting Sites

⚠️ **Permanent Action**: Deleted sites cannot be recovered

#### Step 1: Open Site Details

- Click on the site you want to delete

#### Step 2: Click "Delete"

- Click the **🗑️ Delete** button

#### Step 3: Confirm Deletion

- A confirmation prompt appears
- Type the site name to confirm
- Click **"Delete Site"**

**Or Cancel**:
- Click **"Cancel"** or press **Escape** to abort

### Searching Your Vault

**Search Bar**:
- Located at the top of the Sites view
- Start typing to filter sites
- Searches site names, URLs, and usernames
- Results update in real-time

**Example**:
- Type "bank" to find all banking sites
- Type "gmail" to find Gmail accounts
- Type "@example.com" to find sites with that email

---

## Generating Passwords

The password manager includes a powerful password generator.

### Generating Strong Passwords

#### Step 1: Access Password Generator

**Option A**: During Site Creation/Editing
- Click **"Generate Password"** button in the site form

**Option B**: From Generator Tab (if available)
- Switch to the "Password" tab
- Use the standalone generator

#### Step 2: Configure Options

**Length**:
- Slider: 8-128 characters
- Recommended: 16-20 characters for good balance
- Maximum security: 32+ characters

**Character Types**:
- ☑️ **Uppercase Letters** (A-Z): Checked by default
- ☑️ **Lowercase Letters** (a-z): Checked by default
- ☑️ **Numbers** (0-9): Checked by default
- ☑️ **Special Characters** (!@#$%^&*): Checked by default

**Minimum Requirements**:
- **Min Numbers**: Ensure at least X numbers in password
- **Min Special**: Ensure at least X special characters in password

**Example Configurations**:

1. **Maximum Security** (for critical accounts):
   - Length: 32
   - All character types enabled
   - Min numbers: 4
   - Min special: 4

2. **Balanced** (for most sites):
   - Length: 16
   - All character types enabled
   - Min numbers: 2
   - Min special: 2

3. **Alphanumeric Only** (for systems that don't allow symbols):
   - Length: 20
   - Uppercase, lowercase, numbers only
   - No special characters

#### Step 3: Generate

- Click **"Generate"** button
- A random password is created instantly
- Displayed in the password field

#### Step 4: Regenerate (Optional)

- Click **"Generate"** again for a different password
- No limit on regenerations
- Each generation is completely random

#### Step 5: Use Password

**If in Site Form**:
- Password automatically fills the password field
- Continue filling other site details
- Click "Save Site"

**If in Generator Tab**:
- Click **📋 Copy** to copy to clipboard
- Paste into your site's password field manually
- Or save to your vault first, then copy later

### Generating Memorable Passphrases

Passphrases are easier to remember but still secure.

#### Step 1: Switch to Passphrase Tab

- Click **"Passphrase"** tab in the generator

#### Step 2: Configure Options

**Word Count**:
- Slider: 3-8 words
- Recommended: 4-6 words
- Example: `correct-horse-battery-staple`

**Options**:
- ☑️ **Capitalize First Letter**: `Correct-Horse-Battery-Staple`
- ☑️ **Add Number**: `correct-horse-battery-staple-7249`

**Separator**:
- Choose separator character: `-`, `_`, `.`, ` ` (space), or none
- Default: `-` (hyphen)

**Example Configurations**:

1. **Easy to Remember**:
   - Words: 4
   - Capitalize: Yes
   - Number: No
   - Separator: `-`
   - Result: `Correct-Horse-Battery-Staple`

2. **Extra Security**:
   - Words: 6
   - Capitalize: Yes
   - Number: Yes
   - Separator: `-`
   - Result: `Correct-Horse-Battery-Staple-Freedom-Justice-8341`

3. **No Spaces** (for systems that don't allow spaces):
   - Words: 5
   - Capitalize: Yes
   - Number: Yes
   - Separator: None
   - Result: `CorrectHorseBatteryStapleFreedom2947`

#### Step 3: Generate & Use

- Same process as password generation
- Click **"Generate"**, copy, or assign to site

### Password Strength Indicator

**Real-Time Feedback**:
- Strength meter shows password quality
- Color-coded: Red (Weak) → Yellow (Good) → Green (Strong)
- Suggestions appear below if password is weak

**Improving Strength**:
- Increase length
- Add more character types
- Avoid dictionary words
- Avoid personal information
- Avoid common patterns (123, abc, qwerty)

---

## Security & Best Practices

### Master Password Security

⚠️ **Your Master Password is the Key to Everything**

**DO**:
- ✅ Use a strong, unique password (12+ characters)
- ✅ Store it securely (secure physical location or separate password manager)
- ✅ Memorize it if possible
- ✅ Change it periodically (every 3-6 months)

**DON'T**:
- ❌ Share it with anyone
- ❌ Reuse it on other services
- ❌ Write it on a sticky note on your monitor
- ❌ Store it in plaintext on your computer
- ❌ Use personal information (birthdays, names, addresses)

### Vault Management

**Best Practices**:
- **Regular Review**: Review your vault monthly for outdated entries
- **Update Passwords**: Rotate passwords for critical sites regularly
- **Delete Unused**: Remove sites you no longer use
- **Add Notes**: Include security question answers, recovery emails, etc.

**What to Store**:
- ✅ Website login credentials
- ✅ Application passwords
- ✅ Database access credentials
- ✅ API keys (in notes field)
- ✅ Security question answers

**What NOT to Store**:
- ❌ Credit card numbers (use dedicated tools)
- ❌ Social Security numbers (too sensitive)
- ❌ Unencrypted private keys
- ❌ Master passwords for other services

### Device Security

**Essential**:
- ✅ Lock your device when not in use
- ✅ Use device password/PIN/biometrics
- ✅ Keep OS and browser updated
- ✅ Use antivirus software
- ✅ Enable firewall

**When Using Shared Computers**:
- ⚠️ **Avoid if possible**: Don't access vault on shared/public computers
- If necessary:
  - Use private/incognito mode
  - Always log out when finished
  - Clear browser data after use
  - Never save password in browser

### Session Management

**Automatic Logout**:
- Sessions expire after 24 hours of inactivity
- You'll need to log in again
- This protects your vault if you forget to log out

**Manual Logout**:
- Always log out when finished
- Especially on shared devices
- Click **"Logout"** button in Settings

**Multiple Devices**:
- You can be logged in on multiple devices simultaneously
- Each device has its own session
- Logging out on one device doesn't affect others

### Network Security

**HTTPS**:
- Always access the password manager over HTTPS
- Production deployments require HTTPS (Web Crypto API requirement)
- Look for 🔒 padlock in browser address bar

**Public Wi-Fi**:
- ⚠️ **Exercise Caution**: Avoid accessing vault on public Wi-Fi
- If necessary:
  - Use VPN for extra security
  - Verify HTTPS connection
  - Log out immediately after use

### Activity Monitoring

**Login History**:
- Navigate to Settings → Activity/History (if available)
- Review recent login attempts
- Check for suspicious activity

**Red Flags**:
- Failed login attempts you didn't make
- Logins from unfamiliar locations (if logged)
- Unexpected session expirations

**If Compromised**:
1. Change master password immediately
2. Review vault for unauthorized changes
3. Rotate passwords for all critical sites
4. Enable 2FA if not already enabled
5. Check device for malware

---

## Account Management

### Changing Your Master Password

⚠️ **Important**: This requires knowing your current password

#### Step 1: Navigate to Settings

- Click **⚙️ Settings**
- Find "Change Password" section

#### Step 2: Verify Current Password

- Enter your current master password
- This authenticates the password change

#### Step 3: Enter New Password

- Enter new master password
- Must meet strength requirements (score ≥3)
- Confirm new password

#### Step 4: Save Changes

- Click **"Change Password"**
- Your password is updated
- **Important**: Your vault is re-encrypted with the new password-derived key
- This may take a moment (~500ms per Argon2id derivation)

### Deleting Your Account

⚠️ **PERMANENT ACTION**: Account deletion cannot be undone!

**What Gets Deleted**:
- Your user account
- All stored sites and passwords
- All sessions
- All activity logs
- Your 2FA settings and backup codes

**What You Lose**:
- Access to your vault (encrypted data is deleted)
- All stored credentials
- Login history

#### Step 1: Navigate to Settings

- Click **⚙️ Settings**
- Scroll to "Danger Zone" section

#### Step 2: Click "Delete Account"

- Click **"Delete My Account"** button
- A confirmation modal appears

#### Step 3: Confirm Deletion

- Read the warning carefully
- Type your username to confirm
- Enter your master password
- Click **"Delete Account Permanently"**

#### Step 4: Account Deleted

- You're logged out automatically
- All data is deleted from IndexedDB
- You'll return to the registration/login screen

**Alternative: Export Data First**
- ⚠️ Currently not implemented
- Planned feature: Export vault to encrypted JSON before deletion
- Check for updates

---

## Troubleshooting

### Can't Log In

**Problem**: Password not working, can't access account

**Solutions**:
1. **Check Caps Lock**: Passwords are case-sensitive
2. **Try Again Slowly**: Ensure typing correctly
3. **Account Locked**: Wait 15 minutes if locked (5 failed attempts)
4. **Browser Issues**: Try different browser, clear cache
5. **2FA Code**: Ensure code is current (refreshes every 30 seconds)

**If Password Forgotten**:
- ⚠️ **Cannot Recover**: Master passwords cannot be recovered
- You'll need to create a new account
- Previous vault data will be inaccessible

### 2FA Code Not Working

**Problem**: TOTP code rejected, can't log in

**Solutions**:
1. **Wait for Next Code**: Codes refresh every 30 seconds
2. **Check Time Sync**: Ensure device clock is accurate
3. **Try Previous/Next Window**: Codes valid for ±30 seconds
4. **Use Backup Code**: Enter backup code instead
5. **Re-scan QR Code**: If persistent, disable and re-enable 2FA

**Time Sync**:
- **iOS**: Settings → General → Date & Time → Set Automatically
- **Android**: Settings → Date & Time → Use network-provided time
- **Windows**: Settings → Time & Language → Set time automatically
- **macOS**: System Preferences → Date & Time → Set date and time automatically

### Slow Performance

**Problem**: App loading slowly, actions taking too long

**Causes**:
1. **Argon2id Key Derivation**: ~500ms is normal (security vs. speed tradeoff)
2. **Large Vault**: Many sites may slow search/rendering
3. **Old Browser**: Update to latest version
4. **Device Limitations**: Older devices may struggle with cryptography

**Solutions**:
1. **Wait for Key Derivation**: First 500ms is expected
2. **Update Browser**: Use latest version for performance improvements
3. **Reduce Vault Size**: Archive or delete unused sites
4. **Check Device**: Ensure device meets minimum requirements

### Browser Data Cleared

**Problem**: Accidentally cleared browser data, vault gone

**Unfortunately**:
- ⚠️ **Data Cannot Be Recovered**: Clearing browser data deletes IndexedDB
- Your vault is permanently lost
- You'll need to start fresh

**Prevention**:
- Be careful with "Clear Browsing Data" features
- Understand what data is being cleared
- Future feature: Export vault for backups
- Consider browser sync features (with caution)

### Site Not Saving

**Problem**: Changes not saving, edits disappearing

**Solutions**:
1. **Check Required Fields**: Ensure site name is filled
2. **Check Storage Quota**: Browser may be out of storage space
3. **Console Errors**: Open browser console (F12) for error messages
4. **Try Again**: Reload page and retry
5. **Different Browser**: Test in another browser

**Storage Quota Check**:
- Open browser console (F12)
- Check for warnings about storage limits
- Clear old history entries if needed

### Can't Copy to Clipboard

**Problem**: Copy buttons not working

**Solutions**:
1. **Browser Permissions**: Allow clipboard access when prompted
2. **HTTPS Required**: Some browsers require HTTPS for clipboard API
3. **User Gesture**: Click the button, don't use keyboard
4. **Safari**: Requires user gesture (click, not automated)
5. **Manual Copy**: Select text manually and Ctrl/Cmd+C

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| **Tab** | Move focus to next element |
| **Shift + Tab** | Move focus to previous element |
| **Enter** | Submit current form / Confirm action |
| **Escape** | Close modal / Cancel action |

### Navigation

| Shortcut | Action |
|----------|--------|
| **Arrow Keys** | Navigate between tabs (Password/Passphrase) |
| **Home** | Jump to first item in list |
| **End** | Jump to last item in list |

### Modals

| Shortcut | Action |
|----------|--------|
| **Escape** | Close any open modal |
| **Enter** | Submit modal form (when in input field) |

### Forms

| Shortcut | Action |
|----------|--------|
| **Tab** | Move to next form field |
| **Shift + Tab** | Move to previous form field |
| **Enter** | Submit form |

### Accessibility

- **Focus Indicators**: All interactive elements have visible focus outlines
- **Screen Reader Support**: All elements properly labeled with ARIA
- **Keyboard-Only**: Entire app usable without mouse

---

## Getting Help

### Documentation

- **User Guide**: This document (comprehensive usage instructions)
- **Security Model**: [SECURITY.md](./SECURITY.md) (cryptography, threat model)
- **Migration Guide**: [MIGRATION.md](./MIGRATION.md) (upgrading from v1.x)
- **README**: [README.md](./README.md) (overview, features, quick start)

### Support Channels

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions, share tips
- **Security Issues**: security@example.com (for vulnerabilities)

### FAQs

**Q: Is my data sent to a server?**  
A: No, everything stays in your browser. No backend server, no cloud storage.

**Q: Can I sync across devices?**  
A: Not currently. Future versions may include encrypted export/import.

**Q: What if I forget my master password?**  
A: Unfortunately, it cannot be recovered. You'll need to create a new account.

**Q: How do I back up my vault?**  
A: Manual export feature is planned for future release.

**Q: Is this secure enough for banking passwords?**  
A: The cryptography is industry-standard (Argon2id, AES-256-GCM), but understand the threat model. For maximum security, consider dedicated password managers.

---

**Thank you for using the Password Manager!** 🔐

For questions, issues, or feedback, please visit the GitHub repository.
