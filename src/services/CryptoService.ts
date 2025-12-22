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

import * as argon2 from 'argon2-browser';

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
  // Password Hashing (Argon2id)
  // ==========================================================================

  /**
   * Hashes a password using Argon2id
   * 
   * Uses Argon2id algorithm (winner of Password Hashing Competition 2015)
   * with parameters recommended by OWASP and validated in TASK-005.
   * 
   * Parameters:
   * - Time (iterations): 3
   * - Memory: 64 MiB (65536 KiB)
   * - Parallelism: 1 (browser limitation)
   * - Hash length: 32 bytes (256 bits)
   * 
   * Performance: ~500-1200ms on desktop, ~1200-2000ms on mobile
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to Argon2 encoded hash string
   * @throws {CryptoError} If hashing fails or password is empty
   * 
   * @example
   * ```typescript
   * const hash = await crypto.hashPassword('user_password');
   * // Returns: $argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>
   * ```
   */
  public async hashPassword(password: string): Promise<string> {
    // Validate input
    if (!password || typeof password !== 'string') {
      throw new CryptoError(
        'Password must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (password.length === 0) {
      throw new CryptoError(
        'Password cannot be empty',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    try {
      // Generate random salt
      const salt = this.generateSalt();

      // Hash password with Argon2id
      const result = await argon2.hash({
        pass: password,
        salt: salt,
        time: ARGON2_CONFIG.time,
        mem: ARGON2_CONFIG.mem,
        hashLen: ARGON2_CONFIG.hashLen,
        parallelism: ARGON2_CONFIG.parallelism,
        type: argon2.ArgonType.Argon2id,
      });

      // Return encoded hash string
      // Format: $argon2id$v=19$m=65536,t=3,p=1$<base64_salt>$<base64_hash>
      return result.encoded;
    } catch (error) {
      throw new CryptoError(
        'Failed to hash password',
        CryptoErrorCode.HASH_FAILED,
        error as Error
      );
    }
  }

  /**
   * Verifies a password against an Argon2 hash
   * 
   * Uses constant-time comparison to prevent timing attacks.
   * The Argon2 verification function handles this internally.
   * 
   * @param password - Plain text password to verify
   * @param hash - Argon2 encoded hash string (from hashPassword)
   * @returns Promise resolving to true if password matches, false otherwise
   * @throws {CryptoError} If verification fails due to invalid inputs
   * 
   * @example
   * ```typescript
   * const isValid = await crypto.verifyPassword('user_password', storedHash);
   * if (isValid) {
   *   // Password correct, proceed with login
   * } else {
   *   // Password incorrect, deny access
   * }
   * ```
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Validate inputs
    if (!password || typeof password !== 'string') {
      throw new CryptoError(
        'Password must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (!hash || typeof hash !== 'string') {
      throw new CryptoError(
        'Hash must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Validate hash format (should start with $argon2)
    if (!hash.startsWith('$argon2')) {
      throw new CryptoError(
        'Invalid hash format: must be Argon2 encoded string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    try {
      // Verify password against hash
      // This function uses constant-time comparison internally
      const result = await argon2.verify({
        pass: password,
        encoded: hash,
      });

      // Return verification result
      return result;
    } catch (error) {
      // If verification throws, password is incorrect or hash is invalid
      // Return false instead of throwing to avoid information leakage
      return false;
    }
  }

  // ==========================================================================
  // Key Derivation (PBKDF2)
  // ==========================================================================

  /**
   * Derives an encryption key from a master password using PBKDF2
   * 
   * Uses PBKDF2-HMAC-SHA256 with 100,000 iterations per NIST SP 800-63B
   * and OWASP recommendations. The derived key is suitable for AES-256-GCM
   * encryption and is marked non-extractable for security.
   * 
   * Parameters:
   * - Iterations: 100,000 (exceeds NIST minimum of 10,000)
   * - Hash: SHA-256
   * - Key length: 256 bits (for AES-256)
   * 
   * Performance: ~500-1500ms on desktop, ~1500-3000ms on mobile
   * 
   * @param masterPassword - Master password to derive key from
   * @param salt - Salt for key derivation (Uint8Array or base64 string)
   * @returns Promise resolving to non-extractable CryptoKey for AES-GCM
   * @throws {CryptoError} If key derivation fails
   * 
   * @example
   * ```typescript
   * const salt = crypto.generateSalt();
   * const key = await crypto.deriveEncryptionKey('user_master_password', salt);
   * 
   * // Use key for encryption
   * const encrypted = await crypto.encryptData(data, key);
   * ```
   */
  public async deriveEncryptionKey(
    masterPassword: string,
    salt: Uint8Array | string
  ): Promise<CryptoKey> {
    // Validate master password
    if (!masterPassword || typeof masterPassword !== 'string') {
      throw new CryptoError(
        'Master password must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (masterPassword.length === 0) {
      throw new CryptoError(
        'Master password cannot be empty',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Convert salt to Uint8Array if it's a base64 string
    let saltBytes: Uint8Array;
    if (typeof salt === 'string') {
      try {
        saltBytes = this.base64ToBytes(salt);
      } catch (error) {
        throw new CryptoError(
          'Invalid salt: must be Uint8Array or valid base64 string',
          CryptoErrorCode.INVALID_SALT,
          error as Error
        );
      }
    } else if (salt instanceof Uint8Array) {
      saltBytes = salt;
    } else {
      throw new CryptoError(
        'Invalid salt type: must be Uint8Array or base64 string',
        CryptoErrorCode.INVALID_SALT
      );
    }

    // Validate salt length (NIST minimum: 16 bytes, we use 32 bytes)
    if (saltBytes.length < 16) {
      throw new CryptoError(
        `Salt too short: minimum 16 bytes required, got ${saltBytes.length} bytes`,
        CryptoErrorCode.INVALID_SALT
      );
    }

    try {
      // Step 1: Import master password as key material
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(masterPassword),
        'PBKDF2',
        false, // not extractable
        ['deriveKey']
      );

      // Step 2: Derive AES-GCM key using PBKDF2
      // Create a new Uint8Array with ArrayBuffer to satisfy TypeScript
      const saltBuffer = new Uint8Array(saltBytes);
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: PBKDF2_ITERATIONS, // 100,000
          hash: 'SHA-256',
        },
        passwordKey,
        {
          name: 'AES-GCM',
          length: KEY_LENGTH, // 256 bits
        },
        false, // not extractable (key cannot be exported)
        ['encrypt', 'decrypt']
      );

      return derivedKey;
    } catch (error) {
      throw new CryptoError(
        'Failed to derive encryption key',
        CryptoErrorCode.KEY_DERIVATION_FAILED,
        error as Error
      );
    }
  }

  // ==========================================================================
  // Data Encryption (AES-256-GCM)
  // ==========================================================================

  /**
   * Encrypts data using AES-256-GCM
   * 
   * Uses AES-256-GCM (Galois/Counter Mode) which provides both confidentiality
   * (encryption) and authenticity (tamper detection). Any modification to the
   * ciphertext will cause decryption to fail.
   * 
   * Process:
   * 1. JSON stringify the data
   * 2. Generate random IV (96 bits for GCM)
   * 3. Encrypt with AES-GCM
   * 4. Base64 encode ciphertext, IV, and salt
   * 
   * @param data - Data to encrypt (will be JSON stringified)
   * @param key - CryptoKey for encryption (from deriveEncryptionKey)
   * @param options - Optional encryption options (custom salt)
   * @returns Promise resolving to EncryptedData structure
   * @throws {CryptoError} If encryption fails
   * 
   * @example
   * ```typescript
   * const salt = crypto.generateSalt();
   * const key = await crypto.deriveEncryptionKey('master_password', salt);
   * const encrypted = await crypto.encryptData({ secret: 'data' }, key, { salt });
   * 
   * // encrypted = {
   * //   ciphertext: "base64...",
   * //   iv: "base64...",
   * //   salt: "base64..."
   * // }
   * ```
   */
  public async encryptData(
    data: any,
    key: CryptoKey,
    options?: EncryptionOptions
  ): Promise<EncryptedData> {
    // Validate key
    if (!key || !(key instanceof CryptoKey)) {
      throw new CryptoError(
        'Invalid key: must be a CryptoKey instance',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Validate key is suitable for encryption
    if (key.type !== 'secret') {
      throw new CryptoError(
        'Invalid key type: must be a secret key',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (!key.usages.includes('encrypt')) {
      throw new CryptoError(
        'Invalid key usage: key must support encryption',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Validate data is provided
    if (data === undefined || data === null) {
      throw new CryptoError(
        'Data cannot be undefined or null',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    try {
      // Step 1: JSON stringify the data
      const plaintext = JSON.stringify(data);
      const plaintextBytes = new TextEncoder().encode(plaintext);

      // Step 2: Generate random IV (96 bits for GCM)
      const iv = this.generateIV();
      const ivBuffer = new Uint8Array(iv);

      // Step 3: Encrypt with AES-GCM
      const ciphertextBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
        },
        key,
        plaintextBytes
      );

      // Step 4: Convert to Uint8Array and base64 encode
      const ciphertextBytes = new Uint8Array(ciphertextBuffer);
      const ciphertext = this.bytesToBase64(ciphertextBytes);
      const ivBase64 = this.bytesToBase64(iv);

      // Get salt (either from options or generate new one)
      // Note: In practice, salt should be passed from deriveEncryptionKey
      const salt = options?.salt || this.generateSalt();
      const saltBase64 = this.bytesToBase64(salt);

      return {
        ciphertext,
        iv: ivBase64,
        salt: saltBase64,
      };
    } catch (error) {
      throw new CryptoError(
        'Failed to encrypt data',
        CryptoErrorCode.ENCRYPTION_FAILED,
        error as Error
      );
    }
  }

  // ==========================================================================
  // Data Decryption (AES-256-GCM)
  // ==========================================================================

  /**
   * Decrypts data using AES-256-GCM
   * 
   * Uses AES-256-GCM (Galois/Counter Mode) to decrypt and authenticate data.
   * GCM mode provides authenticated encryption, meaning any tampering with the
   * ciphertext, IV, or authentication tag will cause decryption to fail.
   * 
   * Process:
   * 1. Base64 decode ciphertext and IV
   * 2. Decrypt with AES-GCM
   * 3. JSON parse the decrypted plaintext
   * 
   * @param encrypted - EncryptedData structure from encryptData
   * @param key - CryptoKey for decryption (must match encryption key)
   * @returns Promise resolving to decrypted data (JSON parsed)
   * @throws {CryptoError} If decryption fails or data is tampered
   * 
   * @example
   * ```typescript
   * const salt = crypto.generateSalt();
   * const key = await crypto.deriveEncryptionKey('master_password', salt);
   * const encrypted = await crypto.encryptData({ secret: 'data' }, key, { salt });
   * 
   * // Later, with the same key:
   * const decrypted = await crypto.decryptData(encrypted, key);
   * // decrypted = { secret: 'data' }
   * ```
   */
  public async decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<any> {
    // Validate encrypted data structure
    if (!encrypted || typeof encrypted !== 'object') {
      throw new CryptoError(
        'Invalid encrypted data: must be an object',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (!encrypted.ciphertext || typeof encrypted.ciphertext !== 'string') {
      throw new CryptoError(
        'Invalid encrypted data: ciphertext must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (!encrypted.iv || typeof encrypted.iv !== 'string') {
      throw new CryptoError(
        'Invalid encrypted data: iv must be a non-empty string',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Validate key
    if (!key || !(key instanceof CryptoKey)) {
      throw new CryptoError(
        'Invalid key: must be a CryptoKey instance',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    // Validate key is suitable for decryption
    if (key.type !== 'secret') {
      throw new CryptoError(
        'Invalid key type: must be a secret key',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    if (!key.usages.includes('decrypt')) {
      throw new CryptoError(
        'Invalid key usage: key must support decryption',
        CryptoErrorCode.INVALID_INPUT
      );
    }

    try {
      // Step 1: Base64 decode ciphertext and IV
      const ciphertextBytes = this.base64ToBytes(encrypted.ciphertext);
      const ivBytes = this.base64ToBytes(encrypted.iv);

      // Validate IV length (must be 12 bytes for GCM)
      if (ivBytes.length !== IV_LENGTH) {
        throw new CryptoError(
          `Invalid IV length: expected ${IV_LENGTH} bytes, got ${ivBytes.length}`,
          CryptoErrorCode.INVALID_INPUT
        );
      }

      // Convert to proper buffer types for Web Crypto API
      const ivBuffer = new Uint8Array(ivBytes);
      const ciphertextBuffer = new Uint8Array(ciphertextBytes);

      // Step 2: Decrypt with AES-GCM
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
        },
        key,
        ciphertextBuffer
      );

      // Step 3: Decode and JSON parse
      const plaintextBytes = new Uint8Array(plaintextBuffer);
      const plaintext = new TextDecoder().decode(plaintextBytes);
      
      // Parse JSON
      try {
        const data = JSON.parse(plaintext);
        return data;
      } catch (parseError) {
        throw new CryptoError(
          'Failed to parse decrypted data: invalid JSON',
          CryptoErrorCode.DECRYPTION_FAILED,
          parseError as Error
        );
      }
    } catch (error) {
      // Handle specific Web Crypto errors
      if (error instanceof CryptoError) {
        throw error;
      }

      // Web Crypto throws OperationError for authentication failures
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new CryptoError(
          'Decryption failed: data may be corrupted or tampered, or wrong key used',
          CryptoErrorCode.DECRYPTION_FAILED,
          error
        );
      }

      throw new CryptoError(
        'Failed to decrypt data',
        CryptoErrorCode.DECRYPTION_FAILED,
        error as Error
      );
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generates a cryptographically secure random token
   * 
   * Useful for session tokens, API keys, CSRF tokens, etc.
   * Uses crypto.getRandomValues for cryptographic randomness.
   * 
   * @param length - Length of token in bytes (default: 32)
   * @returns Base64-encoded token string
   * 
   * @example
   * ```typescript
   * const token = crypto.generateToken();
   * // Returns: base64 string representing 32 random bytes
   * ```
   */
  public generateToken(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return this.bytesToBase64(bytes);
  }

  /**
   * Generates a UUID v4 (random UUID)
   * 
   * Creates a universally unique identifier using cryptographically secure
   * random numbers. Follows RFC 4122 UUID v4 specification.
   * 
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * - x: any hexadecimal digit
   * - 4: version 4 indicator
   * - y: one of 8, 9, a, or b
   * 
   * @returns UUID v4 string
   * 
   * @example
   * ```typescript
   * const uuid = crypto.generateUUID();
   * // Returns: "550e8400-e29b-41d4-a716-446655440000"
   * ```
   */
  public generateUUID(): string {
    // Generate 16 random bytes
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    // Set version (4) and variant (RFC 4122) bits
    // Version 4: set bits 4-7 of byte 6 to 0100
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    
    // Variant (RFC 4122): set bits 6-7 of byte 8 to 10
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;

    // Convert to hex and format as UUID
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Validates password strength according to OWASP and NIST guidelines
   * 
   * Implements OWASP ASVS 4.0 V2.1.1 and NIST SP 800-63B requirements:
   * - Minimum 8 characters (OWASP/NIST requirement)
   * - Maximum 256 characters (we exceed NIST minimum of 128)
   * - Check against common passwords (NIST recommendation)
   * - NO composition rules (per OWASP guidance)
   * 
   * IMPORTANT: Per OWASP, we do NOT enforce "must contain uppercase, 
   * lowercase, number, special character" rules as these:
   * - Reduce password entropy
   * - Lead to predictable patterns
   * - Frustrate users
   * - Are less effective than length requirements
   * 
   * @param password - Password to validate
   * @returns Validation result with isValid flag and error messages
   * 
   * @example
   * ```typescript
   * const result = crypto.validatePasswordStrength('mypassword');
   * if (!result.isValid) {
   *   console.log('Errors:', result.errors);
   * }
   * ```
   */
  public validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate input
    if (password === undefined || password === null) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (typeof password !== 'string') {
      errors.push('Password must be a string');
      return { isValid: false, errors };
    }

    // OWASP ASVS 2.1.1: Minimum 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    // Allow up to 256 characters (exceeds OWASP minimum of 128)
    if (password.length > 256) {
      errors.push('Password must be less than 256 characters');
    }

    // NIST SP 800-63B: Check against common passwords
    // Using a basic check for demonstration - in production, use a comprehensive list
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if password is in common password list
   * 
   * Basic implementation checking against most common weak passwords.
   * In production, this should check against a comprehensive list like
   * HIBP (Have I Been Pwned) or NIST's banned password list.
   * 
   * @param password - Password to check
   * @returns true if password is common, false otherwise
   * @private
   */
  private isCommonPassword(password: string): boolean {
    // Convert to lowercase for case-insensitive comparison
    const lower = password.toLowerCase();

    // Top 100 most common passwords (subset for demonstration)
    const commonPasswords = [
      'password', '123456', '123456789', '12345678', '12345', '1234567',
      'password1', '123123', '1234567890', 'qwerty', 'abc123', 'million2',
      'password123', '111111', 'iloveyou', 'welcome', 'monkey', 'dragon',
      'master', 'sunshine', 'princess', 'football', 'qwerty123', 'admin',
      'letmein', 'login', 'passw0rd', 'starwars', 'batman', 'trustno1',
      'superman', 'hello', 'freedom', 'computer', 'whatever', 'test',
      'solo', 'charlie', 'jordan', 'shadow', 'michael', 'jennifer',
      'jessica', 'daniel', 'letmein', 'secret', 'welcome1', 'pass',
      '123', '1234', 'root', 'admin123', 'administrator', 'user',
      'guest', 'demo', 'test123', 'password!', 'qwertyuiop', 'asdfgh',
      'zxcvbn', 'qazwsx', '123qwe', 'abc', 'abcd1234', 'temp', 'changeme',
    ];

    // Check exact matches
    if (commonPasswords.includes(lower)) {
      return true;
    }

    // Check simple patterns
    if (/^[0-9]+$/.test(password) && password.length <= 10) {
      return true; // All numbers (up to 10 digits) are considered weak
    }

    if (/^[a-zA-Z]+$/.test(password) && password.length <= 8) {
      return true; // All letters (up to 8 chars) without numbers/symbols are weak
    }

    // Check keyboard patterns
    const keyboardPatterns = [
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', 'qazwsxedc'
    ];
    
    for (const pattern of keyboardPatterns) {
      if (lower.includes(pattern)) {
        return true;
      }
    }

    return false;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

/**
 * Singleton instance of CryptoService for application-wide use
 */
export const cryptoService = new CryptoService();
