/**
 * Type definitions for argon2-browser
 * 
 * This is a minimal type definition for the argon2-browser library
 * based on its actual API usage in the application.
 */

declare module 'argon2-browser' {
  /**
   * Argon2 algorithm types
   */
  export enum ArgonType {
    Argon2d = 0,
    Argon2i = 1,
    Argon2id = 2,
  }

  /**
   * Options for Argon2 hash operation
   */
  export interface Argon2HashOptions {
    /** Password to hash */
    pass: string | Uint8Array;
    /** Salt for hashing */
    salt: Uint8Array;
    /** Number of iterations (time cost) */
    time: number;
    /** Memory cost in KiB */
    mem: number;
    /** Output hash length in bytes */
    hashLen: number;
    /** Degree of parallelism */
    parallelism: number;
    /** Argon2 variant (Argon2d, Argon2i, or Argon2id) */
    type: ArgonType;
  }

  /**
   * Result from Argon2 hash operation
   */
  export interface Argon2HashResult {
    /** Encoded hash string in PHC format */
    encoded: string;
    /** Raw hash bytes */
    hash: Uint8Array;
    /** Hash length in bytes */
    hashHex: string;
  }

  /**
   * Options for Argon2 verify operation
   */
  export interface Argon2VerifyOptions {
    /** Password to verify */
    pass: string | Uint8Array;
    /** Encoded hash string to verify against */
    encoded: string;
  }

  /**
   * Hash a password with Argon2
   */
  export function hash(options: Argon2HashOptions): Promise<Argon2HashResult>;

  /**
   * Verify a password against an Argon2 hash
   * @returns true if password matches, false otherwise
   */
  export function verify(options: Argon2VerifyOptions): Promise<boolean>;
}
