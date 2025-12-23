/**
 * TotpService - Two-Factor Authentication Service
 * 
 * Handles TOTP (Time-based One-Time Password) generation, validation,
 * QR code generation, and backup code management for 2FA.
 */

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import type { User } from '../models/User';

/**
 * TotpService class for two-factor authentication
 */
export class TotpService {
  // Backup code configuration
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;
  private readonly BACKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars

  // TOTP configuration
  private readonly TOTP_ALGORITHM = 'SHA1';
  private readonly TOTP_DIGITS = 6;
  private readonly TOTP_PERIOD = 30; // seconds
  private readonly TOTP_WINDOW = 1; // ±30 seconds time drift tolerance

  // QR code configuration
  private readonly QR_SIZE = 256;
  private readonly QR_ERROR_CORRECTION = 'M' as const;

  /**
   * Generate a new TOTP secret
   * 
   * Creates a cryptographically secure random secret for TOTP generation.
   * Returns a base32-encoded secret string.
   * 
   * @returns Base32-encoded TOTP secret
   * 
   * @example
   * ```typescript
   * const totpService = new TotpService();
   * const secret = totpService.generateSecret();
   * console.log('Secret:', secret); // e.g., "JBSWY3DPEHPK3PXP"
   * ```
   */
  generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 }); // 20 bytes = 160 bits
    return secret.base32;
  }

  /**
   * Generate a QR code for TOTP setup
   * 
   * Creates a QR code image as a data URL that can be scanned by authenticator apps.
   * The QR code encodes a TOTP URI with the secret, username, and issuer.
   * 
   * @param secret - The base32-encoded TOTP secret
   * @param username - The username for display in authenticator app
   * @param issuer - Optional issuer name (default: "Password Manager")
   * @returns Promise resolving to QR code data URL
   * @throws Error if QR code generation fails
   * 
   * @example
   * ```typescript
   * const qrCode = await totpService.generateQRCode(secret, 'john_doe');
   * // Display: <img src={qrCode} alt="TOTP QR Code" />
   * ```
   */
  async generateQRCode(secret: string, username: string, issuer: string = 'Password Manager'): Promise<string> {
    if (!secret) {
      throw new Error('Secret is required for QR code generation');
    }
    if (!username) {
      throw new Error('Username is required for QR code generation');
    }

    try {
      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer,
        label: username,
        algorithm: this.TOTP_ALGORITHM,
        digits: this.TOTP_DIGITS,
        period: this.TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Generate TOTP URI
      const uri = totp.toString();

      // Generate QR code as data URL
      const qrCode = await QRCode.toDataURL(uri, {
        width: this.QR_SIZE,
        errorCorrectionLevel: this.QR_ERROR_CORRECTION,
        margin: 2,
      });

      return qrCode;
    } catch (error) {
      throw new Error(`QR code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a TOTP token
   * 
   * Verifies if a TOTP token is valid for the given secret.
   * Allows time drift of ±1 period (±30 seconds) to account for clock skew.
   * 
   * @param token - The 6-digit TOTP token to validate
   * @param secret - The base32-encoded TOTP secret
   * @returns True if token is valid, false otherwise
   * 
   * @example
   * ```typescript
   * const isValid = totpService.validateToken('123456', secret);
   * if (isValid) {
   *   console.log('Token is valid');
   * }
   * ```
   */
  validateToken(token: string, secret: string): boolean {
    if (!token) {
      return false;
    }
    if (!secret) {
      return false;
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return false;
    }

    try {
      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        algorithm: this.TOTP_ALGORITHM,
        digits: this.TOTP_DIGITS,
        period: this.TOTP_PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Validate token with time drift tolerance
      const delta = totp.validate({
        token,
        window: this.TOTP_WINDOW,
      });

      // delta is null if invalid, or a number indicating time steps offset if valid
      return delta !== null;
    } catch (error) {
      console.error('TOTP validation error:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   * 
   * Creates an array of random alphanumeric backup codes that can be used
   * as a fallback when the authenticator app is unavailable.
   * 
   * @returns Array of 10 8-character backup codes
   * 
   * @example
   * ```typescript
   * const backupCodes = totpService.generateBackupCodes();
   * console.log('Backup codes:', backupCodes);
   * // ['2BK4N8P3', '7GH2M9T6', ...]
   * ```
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    const charCount = this.BACKUP_CODE_CHARS.length;

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = '';
      const randomBytes = new Uint8Array(this.BACKUP_CODE_LENGTH);
      crypto.getRandomValues(randomBytes);

      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        const randomIndex = randomBytes[j]! % charCount;
        code += this.BACKUP_CODE_CHARS[randomIndex];
      }

      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash a backup code
   * 
   * Creates a hash of a backup code for secure storage.
   * Uses SHA-256 to hash the code.
   * 
   * @param code - The backup code to hash
   * @returns Promise resolving to hexadecimal hash string
   * 
   * @example
   * ```typescript
   * const hash = await totpService.hashBackupCode('2BK4N8P3');
   * console.log('Hash:', hash);
   * ```
   */
  async hashBackupCode(code: string): Promise<string> {
    if (!code) {
      throw new Error('Backup code is required for hashing');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      throw new Error(`Backup code hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a backup code
   * 
   * Verifies if a backup code matches a stored hash.
   * 
   * @param code - The backup code to validate
   * @param hashedCode - The stored hash to compare against
   * @returns Promise resolving to true if valid, false otherwise
   * 
   * @example
   * ```typescript
   * const isValid = await totpService.validateBackupCode('2BK4N8P3', storedHash);
   * if (isValid) {
   *   console.log('Backup code is valid');
   * }
   * ```
   */
  async validateBackupCode(code: string, hashedCode: string): Promise<boolean> {
    if (!code || !hashedCode) {
      return false;
    }

    try {
      const codeHash = await this.hashBackupCode(code);
      return codeHash === hashedCode;
    } catch (error) {
      console.error('Backup code validation error:', error);
      return false;
    }
  }

  /**
   * Check if all backup codes are exhausted
   * 
   * Determines if a user has used all their backup codes.
   * 
   * @param user - The user to check
   * @returns True if all backup codes are used, false otherwise
   * 
   * @example
   * ```typescript
   * const exhausted = totpService.areBackupCodesExhausted(user);
   * if (exhausted) {
   *   console.log('User needs to regenerate backup codes');
   * }
   * ```
   */
  areBackupCodesExhausted(user: User): boolean {
    // If user has no backup codes set up, they're not exhausted (just not enabled)
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    if (!user.backupCodesUsed || user.backupCodesUsed.length === 0) {
      return false;
    }

    // Check if all backup codes have been used
    return user.backupCodesUsed.length >= user.backupCodes.length;
  }

  /**
   * Get remaining backup codes count
   * 
   * Calculates how many backup codes are still available.
   * 
   * @param user - The user to check
   * @returns Number of remaining backup codes
   * 
   * @example
   * ```typescript
   * const remaining = totpService.getRemainingBackupCodesCount(user);
   * console.log(`${remaining} backup codes remaining`);
   * ```
   */
  getRemainingBackupCodesCount(user: User): number {
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return 0;
    }

    const usedCount = user.backupCodesUsed?.length || 0;
    const totalCount = user.backupCodes.length;
    return Math.max(0, totalCount - usedCount);
  }
}
