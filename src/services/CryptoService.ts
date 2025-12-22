/**
 * CryptoService - Cryptographic operations for user authentication and data encryption
 * 
 * This service provides cryptographic primitives for:
 * - Password hashing using Argon2id
 * - Encryption key derivation using PBKDF2
 * - Data encryption/decryption using AES-256-GCM
 * 
 * Security Standards:
 * - OWASP ASVS 4.0 compliant
 * - NIST SP 800-63B compliant
 * - See specs/002-user-auth-sites/SECURITY.md for details
 * 
 * @module CryptoService
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Number of iterations for PBKDF2 key derivation
 * NIST SP 800-63B minimum: 10,000
 * OWASP recommendation: 100,000+
 * Our choice: 100,000 (exceeds minimum, provides strong protection)
 */
export const PBKDF2_ITERATIONS = 100000;

/**
 * Length of cryptographic salt in bytes
 * NIST minimum: 16 bytes (128 bits)
 * Our choice: 32 bytes (256 bits) for extra security
 */
export const SALT_LENGTH = 32;

/**
 * Length of encryption key in bits
 * AES-256 requires 256-bit keys
 */
export const KEY_LENGTH = 256;

/**
 * Length of initialization vector (IV) for AES-GCM in bytes
 * NIST recommendation: 12 bytes (96 bits) for GCM mode
 */
export const IV_LENGTH = 12;

/**
 * Argon2 configuration for password hashing
 * Based on OWASP recommendations and performance testing (TASK-005)
 */
export const ARGON2_CONFIG = {
  time: 3,           // iterations (OWASP minimum: 2, our choice: 3)
  mem: 65536,        // memory in KiB (64 MiB) - exceeds OWASP minimum of 19 MiB
  hashLen: 32,       // hash output length in bytes (256 bits)
  parallelism: 1,    // threads (browser limitation: single-threaded)
  type: 2,           // 0 = Argon2d, 1 = Argon2i, 2 = Argon2id (recommended)
} as const;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Custom error class for cryptographic operations
 * Provides specific error types for better error handling
 */
export class CryptoError extends Error {
  public readonly code: string;
  public readonly originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'CryptoError';
    this.code = code;
    this.originalError = originalError;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CryptoError);
    }
  }
}

/**
 * Error codes for CryptoError
 */
export enum CryptoErrorCode {
  // Password hashing errors
  HASH_FAILED = 'HASH_FAILED',
  VERIFY_FAILED = 'VERIFY_FAILED',
  
  // Key derivation errors
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  INVALID_SALT = 'INVALID_SALT',
  
  // Encryption errors
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_CIPHERTEXT = 'INVALID_CIPHERTEXT',
  
  // General errors
  INVALID_INPUT = 'INVALID_INPUT',
  WEB_CRYPTO_UNAVAILABLE = 'WEB_CRYPTO_UNAVAILABLE',
  ARGON2_UNAVAILABLE = 'ARGON2_UNAVAILABLE',
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Encrypted data structure returned from encryption operations
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded salt used for key derivation */
  salt: string;
}

/**
 * Configuration options for encryption operations
 */
export interface EncryptionOptions {
  /** Optional custom salt (if not provided, random salt is generated) */
  salt?: Uint8Array;
}

// ============================================================================
// CryptoService Class
// ============================================================================

/**
 * CryptoService provides cryptographic operations for the application
 * 
 * Features:
 * - Password hashing with Argon2id
 * - Encryption key derivation with PBKDF2
 * - Data encryption/decryption with AES-256-GCM
 * - Secure random number generation
 * 
 * Security Properties:
 * - Keys are never stored (always derived on-demand)
 * - Keys are marked non-extractable when possible
 * - All operations use Web Crypto API for maximum security
 * - Proper error handling prevents information leakage
 * 
 * @example
 * ```typescript
 * const crypto = new CryptoService();
 * 
 * // Hash password for storage
 * const hash = await crypto.hashPassword('user_password');
 * 
 * // Verify password during login
 * const isValid = await crypto.verifyPassword('user_password', hash);
 * 
 * // Encrypt user data
 * const salt = crypto.generateSalt();
 * const key = await crypto.deriveEncryptionKey('master_password', salt);
 * const encrypted = await crypto.encryptData({ sensitive: 'data' }, key);
 * 
 * // Decrypt user data
 * const decrypted = await crypto.decryptData(encrypted, key);
 * ```
 */
export class CryptoService {
  /**
   * Creates a new CryptoService instance
   * @throws {CryptoError} If Web Crypto API is not available
   */
  constructor() {
    this.validateEnvironment();
  }

  // ==========================================================================
  // Environment Validation
  // ==========================================================================

  /**
   * Validates that the required cryptographic APIs are available
   * @throws {CryptoError} If Web Crypto API is not available
   * @private
   */
  private validateEnvironment(): void {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new CryptoError(
        'Web Crypto API is not available. This application requires a modern browser with crypto.subtle support.',
        CryptoErrorCode.WEB_CRYPTO_UNAVAILABLE
      );
    }
  }

  // ==========================================================================
  // Random Number Generation
  // ==========================================================================

  /**
   * Generates a cryptographically secure random salt
   * 
   * @param length - Length of salt in bytes (default: SALT_LENGTH)
   * @returns Uint8Array containing random bytes
   * 
   * @example
   * ```typescript
   * const salt = crypto.generateSalt();
   * console.log(salt.length); // 32 bytes
   * ```
   */
  public generateSalt(length: number = SALT_LENGTH): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Generates a cryptographically secure random initialization vector (IV)
   * 
   * @param length - Length of IV in bytes (default: IV_LENGTH)
   * @returns Uint8Array containing random bytes
   * 
   * @example
   * ```typescript
   * const iv = crypto.generateIV();
   * console.log(iv.length); // 12 bytes (96 bits for AES-GCM)
   * ```
   */
  public generateIV(length: number = IV_LENGTH): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // ==========================================================================
  // Encoding/Decoding Utilities
  // ==========================================================================

  /**
   * Converts Uint8Array to Base64 string
   * @param bytes - Byte array to encode
   * @returns Base64-encoded string
   * @private
   */
  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Converts Base64 string to Uint8Array
   * @param base64 - Base64-encoded string
   * @returns Decoded byte array
   * @throws {CryptoError} If base64 string is invalid
   * @private
   */
  private base64ToBytes(base64: string): Uint8Array {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      throw new CryptoError(
        'Invalid base64 string',
        CryptoErrorCode.INVALID_INPUT,
        error as Error
      );
    }
  }

  // ==========================================================================
  // Password Hashing (Argon2id) - To be implemented in TASK-010
  // ==========================================================================

  /**
   * Hashes a password using Argon2id
   * 
   * This method will be implemented in TASK-010
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to Argon2 encoded hash string
   * @throws {CryptoError} If hashing fails
   */
  public async hashPassword(password: string): Promise<string> {
    throw new Error('Not implemented yet - TASK-010');
  }

  /**
   * Verifies a password against an Argon2 hash
   * 
   * This method will be implemented in TASK-010
   * 
   * @param password - Plain text password to verify
   * @param hash - Argon2 encoded hash string
   * @returns Promise resolving to true if password matches, false otherwise
   * @throws {CryptoError} If verification fails
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    throw new Error('Not implemented yet - TASK-010');
  }

  // ==========================================================================
  // Key Derivation (PBKDF2) - To be implemented in TASK-011
  // ==========================================================================

  /**
   * Derives an encryption key from a master password using PBKDF2
   * 
   * This method will be implemented in TASK-011
   * 
   * @param masterPassword - Master password to derive key from
   * @param salt - Salt for key derivation (Uint8Array or base64 string)
   * @returns Promise resolving to CryptoKey suitable for AES-GCM
   * @throws {CryptoError} If key derivation fails
   */
  public async deriveEncryptionKey(
    masterPassword: string,
    salt: Uint8Array | string
  ): Promise<CryptoKey> {
    throw new Error('Not implemented yet - TASK-011');
  }

  // ==========================================================================
  // Data Encryption (AES-256-GCM) - To be implemented in TASK-012
  // ==========================================================================

  /**
   * Encrypts data using AES-256-GCM
   * 
   * This method will be implemented in TASK-012
   * 
   * @param data - Data to encrypt (will be JSON stringified)
   * @param key - CryptoKey for encryption
   * @param options - Optional encryption options
   * @returns Promise resolving to EncryptedData structure
   * @throws {CryptoError} If encryption fails
   */
  public async encryptData(
    data: any,
    key: CryptoKey,
    options?: EncryptionOptions
  ): Promise<EncryptedData> {
    throw new Error('Not implemented yet - TASK-012');
  }

  // ==========================================================================
  // Data Decryption (AES-256-GCM) - To be implemented in TASK-013
  // ==========================================================================

  /**
   * Decrypts data using AES-256-GCM
   * 
   * This method will be implemented in TASK-013
   * 
   * @param encrypted - EncryptedData structure from encryptData
   * @param key - CryptoKey for decryption (must match encryption key)
   * @returns Promise resolving to decrypted data (JSON parsed)
   * @throws {CryptoError} If decryption fails or data is tampered
   */
  public async decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<any> {
    throw new Error('Not implemented yet - TASK-013');
  }

  // ==========================================================================
  // Utility Methods - To be implemented in TASK-014
  // ==========================================================================

  /**
   * Validates password strength according to NIST guidelines
   * 
   * This method will be implemented in TASK-014
   * 
   * @param password - Password to validate
   * @returns Validation result with isValid flag and error messages
   */
  public validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    throw new Error('Not implemented yet - TASK-014');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton instance of CryptoService for application-wide use
 */
export const cryptoService = new CryptoService();
