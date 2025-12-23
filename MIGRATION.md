# Migration Guide

This guide helps you migrate from the standalone password generator (version 1.x) to the authenticated password manager with vault storage (version 2.0+).

## Overview

Version 2.0 introduces significant changes:
- **User Authentication**: Required to access the password manager
- **Encrypted Vault**: Store and manage site credentials securely
- **Two-Factor Authentication**: Optional TOTP 2FA for enhanced security
- **Migrated History**: Your generation history is preserved across the upgrade

## What's Changed

### Before (v1.x)
- Open password generator immediately
- Generate passwords/passphrases
- View generation history (local storage only)
- No user accounts or authentication

### After (v2.0+)
- **Register/Login required** to access the password manager
- Generate **and store** passwords for specific sites
- **Encrypted vault** protects your stored credentials
- **Session management** with automatic logout
- **Activity tracking** for security monitoring
- Generation history preserved from v1.x (read-only until authenticated)

## Migration Process

### Automatic Migration

The application includes automatic database migration when you first load version 2.0:

1. **Open the Application**: Navigate to the app URL
2. **Migration Runs Automatically**: The database schema will upgrade automatically
3. **No Data Loss**: Your existing generation history is preserved
4. **Register Account**: Create your account to access the new features

### Step-by-Step Guide

#### Step 1: Backup Your Data (Recommended)

Before upgrading, consider backing up your browser data:

1. **Export Browser Data**:
   - Chrome: Settings → Privacy → Site Settings → View permissions and data stored across sites
   - Firefox: Developer Tools (F12) → Storage → IndexedDB
   - Safari: Develop → Show Web Inspector → Storage

2. **Document Important Passwords**: If you have important generation history, copy passwords to a temporary secure location

#### Step 2: Upgrade to v2.0

1. **Clear Cache** (optional but recommended):
   ```
   Ctrl+Shift+Delete (Windows/Linux)
   Cmd+Shift+Delete (macOS)
   ```

2. **Load Application**: Navigate to the app URL

3. **Verify Migration**: Check browser console for migration success messages:
   ```
   ✅ Migration 001_initial.ts completed
   ✅ Migration 002_auth_sites.ts completed
   ```

#### Step 3: Create Your Account

1. **Click "Register"** on the authentication screen

2. **Choose Strong Master Password**:
   - Minimum 12 characters recommended
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a passphrase for memorability
   - ⚠️ **CRITICAL**: Store this securely—it cannot be recovered!

3. **Complete Registration**:
   - Enter username (email or unique identifier)
   - Enter and confirm master password
   - Click "Create Account"

4. **Set Up 2FA** (Optional but Recommended):
   - Navigate to Settings (⚙️ icon)
   - Click "Enable Two-Factor Authentication"
   - Scan QR code with authenticator app (Authy, Google Authenticator, etc.)
   - Save backup codes in a secure location
   - Enter TOTP code to confirm

#### Step 4: Migrate Passwords to Vault

Your generation history from v1.x is still accessible, but you'll want to move important passwords to the new encrypted vault:

1. **View Old History**:
   - Before logging in, you can still see your old generation history
   - After logging in, the history is available in the History tab

2. **Add Important Sites**:
   - Click "New Site" in the Sites view
   - Enter site name, URL, username
   - Copy password from old history or generate new one
   - Add notes if needed
   - Click "Save"

3. **Repeat for Each Site**: Add all important credentials to your vault

#### Step 5: Verify Migration

1. **Test Login**: Log out and log back in to verify your credentials work
2. **Test 2FA** (if enabled): Ensure TOTP codes authenticate correctly
3. **Verify Vault Access**: Confirm all your sites are accessible
4. **Test Password Copy**: Ensure clipboard functionality works

## Troubleshooting

### Migration Failed

**Symptom**: Error message "Migration failed" in console

**Solutions**:
1. Clear browser data completely
2. Reload the application
3. If persistent, open browser console (F12) and check for specific error messages
4. Report issue with console logs

### Lost Generation History

**Symptom**: Previous passwords not showing in history

**Solutions**:
1. Check IndexedDB in browser developer tools:
   - Open DevTools (F12)
   - Navigate to Application → Storage → IndexedDB → passwordgen
   - Verify `history` table exists with data

2. If history table is empty, data may have been cleared:
   - This typically happens if browser data was cleared before migration
   - Unfortunately, this data cannot be recovered
   - Consider using the new vault going forward

### Can't Access After Migration

**Symptom**: Stuck at login screen, can't create account

**Solutions**:
1. **Clear Cache and Reload**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS)
2. **Check Browser Compatibility**: Ensure you're using a supported browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
3. **Enable JavaScript**: Ensure JavaScript is enabled in your browser
4. **Check HTTPS**: The app requires HTTPS in production (localhost HTTP is OK for development)

### Forgot Master Password

**Symptom**: Can't remember master password to log in

**Solutions**:
⚠️ **Unfortunately, master passwords cannot be recovered.** This is by design for security.

**Options**:
1. **If you have backup codes**: You cannot use backup codes to reset your password—they only bypass 2FA
2. **Create New Account**: You'll need to register a new account (previous vault data will be inaccessible)
3. **Prevention**: Store your master password in a secure location (password manager, secure note, etc.)

### 2FA Issues

**Symptom**: TOTP codes not working, locked out of account

**Solutions**:
1. **Use Backup Codes**: Enter one of your backup codes instead of TOTP code
2. **Check Time Sync**: Ensure your device clock is synchronized (TOTP requires accurate time)
3. **Wait for Lockout**: If locked out (5 failed attempts), wait 15 minutes before trying again

### Session Expires Too Quickly

**Symptom**: Logged out frequently

**Solutions**:
1. **Default Session**: 24-hour session timeout is default
2. **Activity Extension**: Session extends with activity
3. **Adjust Settings**: Currently fixed at 24 hours (future feature: configurable timeout)

## Data Export/Import

⚠️ **Currently Not Implemented**: Version 2.0 does not include data export/import functionality.

**Planned for Future Release**:
- Export vault to encrypted JSON file
- Import vault from backup file
- Transfer data between browsers/devices

**Current Workaround**:
- Manually copy site credentials to new browser
- Use browser sync features (if available)
- Wait for export/import feature in future release

## Browser Data Management

### Storage Location

- **Database**: IndexedDB (`passwordgen` database)
- **Tables**:
  - `history`: Generation history (pre-auth)
  - `users`: User accounts (encrypted passwords)
  - `sessions`: Active sessions
  - `sites`: Encrypted vault entries
  - `activity`: Login history
  - `migrations`: Schema version tracking

### Clearing Data

⚠️ **Warning**: Clearing browser data will delete your vault!

**To Clear All Data**:
1. Browser Settings → Privacy → Clear Browsing Data
2. Select "Site data" or "Cookies and site data"
3. Confirm deletion

**To Keep Some Data**:
- Export your vault first (when feature is available)
- Or manually copy important credentials before clearing

## Security Considerations

### Master Password Best Practices

1. **Strength**: Use a strong, unique master password
2. **Storage**: Store securely (password manager, secure note, etc.)
3. **Never Share**: Don't share your master password
4. **Unique**: Don't reuse passwords from other services

### 2FA Best Practices

1. **Enable 2FA**: Strongly recommended for additional security
2. **Backup Codes**: Save backup codes in secure location separate from 2FA device
3. **Authenticator App**: Use reputable authenticator (Authy, Google Authenticator, 1Password, etc.)
4. **Device Security**: Ensure your 2FA device is secured with PIN/password

### Vault Security

1. **Encryption**: Your vault is encrypted with AES-256-GCM
2. **Key Derivation**: Encryption key derived from master password (Argon2id)
3. **Local Only**: Data never leaves your browser
4. **No Recovery**: If you forget your master password, vault cannot be decrypted

## Frequently Asked Questions

### Q: Will my old passwords still work?

**A**: Yes, your generation history is preserved and accessible after migration. However, these were never "stored" in v1.x—they're just a record of what was generated. In v2.0, you can now actually store credentials in your encrypted vault.

### Q: Do I need to re-enter all my passwords?

**A**: Your generation history remains accessible, but to take advantage of the new vault features, you'll want to add sites manually. Copy passwords from your history when adding sites to the vault.

### Q: Can I still use the app without authentication?

**A**: No, version 2.0 requires authentication to access the password manager. This is necessary for the encryption and security model. Your vault is encrypted with a key derived from your master password.

### Q: What happens if I clear my browser data?

**A**: ⚠️ Clearing browser data will delete your vault permanently. Your master password cannot decrypt the vault if the encrypted data is deleted. Export your data first (when feature is available) or keep important passwords elsewhere.

### Q: Can I sync across devices?

**A**: Not currently. Version 2.0 is intentionally local-only for privacy. Future versions may include encrypted sync or manual export/import for cross-device transfer.

### Q: Is my data sent to a server?

**A**: No, absolutely not. All data stays in your browser's IndexedDB. There is no backend server, no cloud storage, and no data transmission. This is a privacy-focused, local-only password manager.

### Q: How do I back up my vault?

**A**: Currently, manual backup is required (copy credentials to a secure location). Future versions will include encrypted export functionality.

## Getting Help

If you encounter issues during migration:

1. **Check Console**: Open browser DevTools (F12) and check console for errors
2. **GitHub Issues**: Report issues at [GitHub Issues](https://github.com/yourusername/speckit-passwordgen/issues)
3. **Include Details**:
   - Browser and version
   - Operating system
   - Console error messages
   - Steps to reproduce
4. **Security Issues**: Email security@example.com for security-related concerns

## Rollback (Emergency Only)

If migration causes critical issues and you need to rollback:

⚠️ **Warning**: Rollback will lose all v2.0 data (vault, accounts, etc.)

1. **Clear IndexedDB**:
   ```javascript
   // Browser console (F12)
   indexedDB.deleteDatabase('passwordgen');
   ```

2. **Clear Cache**: Ctrl+Shift+Delete → Clear cache

3. **Load v1.x**: Navigate to the v1.x version of the application

4. **Report Issue**: Please report the issue that caused rollback so it can be fixed

---

**Migration Support**: For questions or issues, please open an issue on GitHub or consult the FAQ section above.
