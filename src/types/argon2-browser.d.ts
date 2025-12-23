/**
 * Type definitions for argon2-browser
 * 
 * This is a minimal type definition for the argon2-browser library
 * based on its actual API usage in the application.
 * 
 * argon2-browser is a UMD module that exports an object containing
 * hash and verify functions.
 */

declare module 'argon2-browser' {
  /**
   * Argon2 algorithm type codes
   * Note: argon2-browser uses numeric codes
   * 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
   */
  export type ArgonType = 0 | 1 | 2;

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
    /** Argon2 variant: 0=Argon2d, 1=Argon2i, 2=Argon2id */
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
    /** Hex-encoded hash */
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
   * The argon2-browser module exports an object with these functions
   */
  interface Argon2Module {
    ArgonType: {
      Argon2d: 0;
      Argon2i: 1;
      Argon2id: 2;
    };
    hash(options: Argon2HashOptions): Promise<Argon2HashResult>;
    verify(options: Argon2VerifyOptions): Promise<boolean>;
    unloadRuntime(): void;
  }

  const argon2: Argon2Module;
  export default argon2;
}
