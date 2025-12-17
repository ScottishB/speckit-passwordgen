import type { PasswordConfig, PassphraseConfig, ValidationResult } from './models';

/**
 * Service for generating passwords
 */
export interface IPasswordGenerator {
  /**
   * Generate a password based on configuration
   * @param config - Password generation configuration
   * @returns Generated password string
   * @throws Error if configuration is invalid
   */
  generate(config: PasswordConfig): string;
  
  /**
   * Validate password configuration
   * @param config - Password configuration to validate
   * @returns Validation result with any error messages
   */
  validate(config: PasswordConfig): ValidationResult;
  
  /**
   * Get default password configuration
   * @returns Default PasswordConfig
   */
  getDefaultConfig(): PasswordConfig;
}

/**
 * Service for generating passphrases
 */
export interface IPassphraseGenerator {
  /**
   * Generate a passphrase based on configuration
   * @param config - Passphrase generation configuration
   * @returns Generated passphrase string
   * @throws Error if configuration is invalid
   */
  generate(config: PassphraseConfig): string;
  
  /**
   * Validate passphrase configuration
   * @param config - Passphrase configuration to validate
   * @returns Validation result with any error messages
   */
  validate(config: PassphraseConfig): ValidationResult;
  
  /**
   * Get default passphrase configuration
   * @returns Default PassphraseConfig
   */
  getDefaultConfig(): PassphraseConfig;
  
  /**
   * Get the wordlist used for generation
   * @returns Array of words
   */
  getWordlist(): string[];
}
